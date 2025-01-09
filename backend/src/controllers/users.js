const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const pool = require('../db');
const { userQueries } = require('../db/queries');
const { logger } = require('../../tests/utils/logger');
const TokenUtility = require('../utils/token.util');
const emailService = require('../utils/emailService.util');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

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

            // Check if email already exists for new registrations
            if (!isUpdate) {
                const existingUser = await userQueries.getUserByEmail(email);
                if (existingUser) {
                    // Check if the user exists but hasn't verified their email
                    if (!existingUser.email_verified) {
                        // Generate new verification token and update
                        const verificationToken = TokenUtility.generateToken();
                        const tokenExpires = TokenUtility.generateExpirationTime(24);

                        await userQueries.updateVerificationToken(
                            email,
                            verificationToken,
                            tokenExpires
                        );

                        try {
                            // Resend verification email
                            await emailService.sendVerificationEmail(email, verificationToken);
                        } catch (emailError) {
                            logger.error('Failed to send verification email:', emailError);
                            return res.status(200).json({
                                needsVerification: true,
                                message: 'Account exists but verification email could not be sent. Please try again or contact support.',
                                emailError: true
                            });
                        }

                        return res.status(200).json({
                            needsVerification: true,
                            message: 'Account already exists but is not verified. A new verification email has been sent.'
                        });
                    }

                    return res.status(400).json({
                        error: 'Email already registered',
                        message: 'This email address is already in use. Please use a different email or try logging in.'
                    });
                }
            }

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
                // New user registration
                const socialMediaJson = JSON.stringify(socialMediaAccounts || []);

                // Generate verification token
                const verificationToken = TokenUtility.generateToken();
                const tokenExpires = TokenUtility.generateExpirationTime(24); // 24 hours

                let newUser;
                try {
                    // Create user first
                    newUser = await userQueries.createUserWithVerification(
                        email,
                        hashedPassword,
                        name,
                        photoUrl,
                        socialMediaJson,
                        bio,
                        verificationToken,
                        tokenExpires
                    );

                    // Then try to send email
                    try {
                        await emailService.sendVerificationEmail(email, verificationToken);
                    } catch (emailError) {
                        logger.error('Failed to send verification email:', emailError);
                        return res.status(201).json({
                            needsVerification: true,
                            email: email,
                            message: 'Registration successful but verification email could not be sent. Please contact support.',
                            emailError: true
                        });
                    }

                    res.status(201).json({
                        needsVerification: true,
                        email: email,
                        message: 'Registration successful. Please check your email to verify your account.'
                    });
                } catch (dbError) {
                    logger.error('Database Error:', dbError);
                    res.status(500).json({
                        error: 'Registration failed',
                        details: dbError.message
                    });
                }
            }
        } catch (err) {
            logger.error('Registration Error:', err);
            res.status(500).json({
                error: 'Registration failed',
                details: err.message
            });
        }
    },

    async loginUser(req, res) {
        try {
            const { email, password } = req.body;
            const user = await userQueries.getUserByEmail(email);

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check if email is verified
            if (!user.email_verified) {
                return res.status(403).json({
                    error: 'Email not verified',
                    needsVerification: true,
                    message: 'Please verify your email before logging in.'
                });
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ token });
        } catch (error) {
            logger.error(error);
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
        const requesterId = req.user.userId;

        console.log('Delete request:', {
            requestedUserId: userId,
            requesterUserId: requesterId,
            requestedType: typeof userId,
            requesterType: typeof requesterId,
            decoded: req.user
        });

        // Convert both IDs to integers before comparison
        const parsedUserId = parseInt(userId);
        const parsedRequesterId = parseInt(requesterId);

        if (parsedUserId !== parsedRequesterId) {
            return res.status(403).json({ 
                error: 'You can only delete your own account',
                requested: parsedUserId,
                requester: parsedRequesterId
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const hostedEvents = await userQueries.getHostedEvents(parsedUserId);

            const eventsController = require('./events');
            for (const event of hostedEvents) {
                const mockReq = {
                    params: { eventId: event.id },
                    user: { userId: parsedUserId },
                    app: req.app
                };
                const mockRes = {
                    status: () => mockRes,
                    json: () => {}
                };

                await eventsController.deleteEvent(mockReq, mockRes);
            }

            await userQueries.deleteUser(client, parsedUserId);
            
            await client.query('COMMIT');
            res.status(204).send();
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error deleting user:', err);
            res.status(500).json({ error: 'Server error' });
        } finally {
            client.release();
        }
    },

    async generateUploadUrl(req, res) {
        try {
            const { fileName, fileType, userId } = req.body;
            const uniqueFileName = `${userId}-${fileName}`;
            
            const command = new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `users/${uniqueFileName}`,
                ContentType: fileType
            });

            const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 60 });
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
    },

    async verifyEmail(req, res) {
        try {
            const { token } = req.params;
            console.log('Backend received verification token:', token);

            // First check if user was already verified with this token
            const recentlyVerifiedUser = await userQueries.getRecentlyVerifiedUser(token);
            if (recentlyVerifiedUser) {
                console.log('User was already verified:', recentlyVerifiedUser.email);
                return res.json({
                    message: 'Email already verified',
                    email: recentlyVerifiedUser.email
                });
            }

            // Check if token exists and hasn't expired
            const user = await userQueries.getUserByVerificationToken(token);
            console.log('Found user for verification:', user);

            if (!user) {
                // Check if the user was just verified (token is now null)
                const justVerifiedUser = await userQueries.getJustVerifiedUser(token);
                if (justVerifiedUser && justVerifiedUser.email_verified) {
                    return res.json({
                        message: 'Email already verified',
                        email: justVerifiedUser.email
                    });
                }

                console.log('No user found for token');
                return res.status(400).json({
                    error: 'Invalid or expired verification token'
                });
            }

            if (TokenUtility.isExpired(user.verification_token_expires)) {
                console.log('Token has expired:', user.verification_token_expires);
                return res.status(400).json({
                    error: 'Verification token has expired'
                });
            }

            // Update user verification status
            const verifiedUser = await userQueries.verifyEmail(token);
            console.log('User verification result:', verifiedUser);

            if (!verifiedUser) {
                console.log('Verification update failed');
                return res.status(400).json({
                    error: 'Failed to verify email'
                });
            }

            res.json({
                message: 'Email verified successfully',
                email: verifiedUser.email
            });

        } catch (error) {
            console.error('Email verification error:', error);
            res.status(500).json({ 
                error: 'Verification failed',
                details: error.message
            });
        }
    },

    async resendVerification(req, res) {
        try {
            const { email } = req.body;
            const user = await userQueries.getUserByEmail(email);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.email_verified) {
                return res.status(400).json({ error: 'Email is already verified' });
            }

            // Generate new verification token using TokenUtility
            const verificationToken = TokenUtility.generateToken();
            const tokenExpires = TokenUtility.generateExpirationTime(24);

            // Update user's verification token
            await userQueries.updateVerificationToken(
                email,
                verificationToken,
                tokenExpires
            );

            // Send new verification email
            await emailService.sendVerificationEmail(email, verificationToken);

            res.json({
                message: 'Verification email resent successfully'
            });

        } catch (error) {
            logger.error('Resend verification error:', error);
            res.status(500).json({ error: 'Failed to resend verification email' });
        }
    },

    async checkVerificationStatus(req, res) {
        try {
            const { token } = req.body;
            const user = await userQueries.getUserByVerificationToken(token);

            if (!user) {
                // If no user found with token, check if any user was recently verified with this token
                const recentlyVerifiedUser = await userQueries.getRecentlyVerifiedUser(token);
                if (recentlyVerifiedUser && recentlyVerifiedUser.email_verified) {
                    return res.json({ isVerified: true });
                }
                return res.json({ isVerified: false });
            }

            res.json({ isVerified: user.email_verified });
        } catch (error) {
            console.error('Error checking verification status:', error);
            res.status(500).json({ error: 'Failed to check verification status' });
        }
    }
};

module.exports = usersController;