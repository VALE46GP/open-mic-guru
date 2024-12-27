const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const pool = require('../db');
const { userQueries } = require('../db/queries');
const { logger } = require('../../tests/utils/logger');

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const usersController = {
    async getAllUsers(req, res) {
        try {
            const users = await userQueries.getAllUsers();
            res.json(users);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async registerUser(req, res) {
        try {
            const { email, password, name, photoUrl, socialMediaAccounts, isUpdate, userId, bio } = req.body;
            let hashedPassword = null;

            if (password) {
                hashedPassword = await bcrypt.hash(password, 10);
            }

            if (isUpdate) {
                const socialMediaJson = JSON.stringify(socialMediaAccounts || []);
                const client = await pool.connect();

                try {
                    await client.query('BEGIN');
                    const updatedUser = await userQueries.updateUser(
                        client,
                        email,
                        name,
                        photoUrl,
                        socialMediaJson,
                        hashedPassword,
                        userId,
                        bio
                    );
                    await client.query('COMMIT');
                    res.status(200).json({ user: updatedUser });
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }
            } else {
                const socialMediaJson = JSON.stringify(socialMediaAccounts || []);
                const newUser = await userQueries.createUser(
                    email,
                    hashedPassword,
                    name,
                    photoUrl,
                    socialMediaJson,
                    bio
                );

                const token = jwt.sign(
                    { userId: newUser.id },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.status(201).json({ user: newUser, token });
            }
        } catch (err) {
            logger.error('Database Error:', err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    async loginUser(req, res) {
        try {
            const { email, password } = req.body;
            const user = await userQueries.getUserByEmail(email);

            if (!user) {
                return res.status(401).json({ message: 'Authentication failed' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Authentication failed' });
            }

            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ token });
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await userQueries.getUserProfileById(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const events = await userQueries.getUserEvents(userId);
            res.json({ user, events });
        } catch (err) {
            logger.error('Error in getUserById:', err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async deleteUser(req, res) {
        const { userId } = req.params;
        const requesterId = req.user.id;

        if (parseInt(userId) !== parseInt(requesterId)) {
            return res.status(403).json({ error: 'You can only delete your own account' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const user = await userQueries.checkUserExists(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            await userQueries.deleteUser(client, userId);
            await client.query('COMMIT');
            res.status(204).send();
        } catch (err) {
            await client.query('ROLLBACK');
            logger.error(err);
            res.status(500).json({ error: 'Server error' });
        } finally {
            client.release();
        }
    },

    async generateUploadUrl(req, res) {
        try {
            const { fileName, fileType, userId } = req.body;
            const uniqueFileName = `${userId}-${fileName}`;
            const s3Params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `users/${uniqueFileName}`,
                Expires: 60,
                ContentType: fileType
            };

            const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params);
            res.json({ uploadURL });
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Error generating upload URL' });
        }
    },

    async validatePassword(req, res) {
        try {
            const { userId, password } = req.body;
            const user = await userQueries.getUserPassword(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid password' });
            }

            res.json({ valid: true });
        } catch (error) {
            logger.error('Error validating password:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};

module.exports = usersController;