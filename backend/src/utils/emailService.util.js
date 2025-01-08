const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { logger } = require('../../tests/utils/logger');

class EmailService {
    constructor() {
        this.sesClient = new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
        });
    }

    /**
     * Send verification email to user
     * @param {string} to - Recipient email address
     * @param {string} verificationToken - Token for email verification
     * @returns {Promise<void>}
     */
    async sendVerificationEmail(to, verificationToken) {
        const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
        console.log('Generated verification link:', verificationLink);

        const params = {
            Source: process.env.SES_VERIFIED_EMAIL,
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: 'Verify your email address',
                    Charset: 'UTF-8'
                },
                Body: {
                    Html: {
                        Data: `
                            <h1>Welcome!</h1>
                            <p>Thank you for signing up. Please click the link below to verify your email address:</p>
                            <a href="${verificationLink}">Verify Email</a>
                            <p>This link will expire in 24 hours.</p>
                            <p>If you didn't create an account, you can safely ignore this email.</p>
                        `,
                        Charset: 'UTF-8'
                    },
                    Text: {
                        Data: `Welcome! Please verify your email by clicking this link: ${verificationLink}`,
                        Charset: 'UTF-8'
                    }
                }
            }
        };

        try {
            const command = new SendEmailCommand(params);
            await this.sesClient.send(command);
            logger.log('Verification email sent successfully');
        } catch (error) {
            logger.error('Error sending verification email:', error);
            throw new Error('Failed to send verification email. Please try again later.');
        }
    }

    /**
     * Send password reset email
     * @param {string} to - Recipient email address
     * @param {string} resetToken - Token for password reset
     * @returns {Promise<void>}
     */
    async sendPasswordResetEmail(to, resetToken) {
        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        const params = {
            Source: process.env.SES_VERIFIED_EMAIL,
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: 'Reset your password',
                    Charset: 'UTF-8'
                },
                Body: {
                    Html: {
                        Data: `
                            <h1>Password Reset Request</h1>
                            <p>You requested to reset your password. Click the link below to create a new password:</p>
                            <a href="${resetLink}">Reset Password</a>
                            <p>This link will expire in 1 hour.</p>
                            <p>If you didn't request a password reset, you can safely ignore this email.</p>
                        `,
                        Charset: 'UTF-8'
                    },
                    Text: {
                        Data: `Reset your password by clicking this link: ${resetLink}`,
                        Charset: 'UTF-8'
                    }
                }
            }
        };

        try {
            const command = new SendEmailCommand(params);
            await this.sesClient.send(command);
            logger.log('Password reset email sent successfully');
        } catch (error) {
            logger.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email. Please try again later.');
        }
    }
}

module.exports = new EmailService();
