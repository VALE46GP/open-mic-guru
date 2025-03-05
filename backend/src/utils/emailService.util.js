const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { logger } = require('../../tests/utils/logger');

class EmailService {
    constructor() {
        this.sesClient = new SESClient({
            region: process.env.REACT_APP_AWS_REGION,
            credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
            }
        });

        this.fromEmail = process.env.REACT_APP_SES_VERIFIED_EMAIL || 'noreply@openmicguru.com';
        this.clientUrl = process.env.CLIENT_URL || 'https://openmicguru.com';
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
            Source: this.fromEmail,
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: 'Verify your OpenMicGuru account',
                    Charset: 'UTF-8'
                },
                Body: {
                    Html: {
                        Data: `
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .button { background-color: #4CAF50; color: white; padding: 10px 20px; 
                                             text-decoration: none; border-radius: 4px; display: inline-block; }
                                    .footer { margin-top: 30px; font-size: 12px; color: #777; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>Welcome to OpenMicGuru!</h1>
                                    <p>Thank you for signing up. Please verify your email address to complete your registration:</p>
                                    <p><a href="${verificationLink}" class="button">Verify Email</a></p>
                                    <p>Or copy and paste this link into your browser:</p>
                                    <p>${verificationLink}</p>
                                    <p>This link will expire in 24 hours.</p>
                                    <p>If you didn't create an account, you can safely ignore this email.</p>
                                    <div class="footer">
                                        <p>&copy; ${new Date().getFullYear()} OpenMicGuru. All rights reserved.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `,
                        Charset: 'UTF-8'
                    },
                    Text: {
                        Data: `Welcome to OpenMicGuru! Please verify your email by clicking this link: ${verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
                        Charset: 'UTF-8'
                    }
                }
            },
            // Add configuration set once you've created one for tracking
            // ConfigurationSetName: 'EmailTracking',

            // Use custom MAIL FROM domain once set up
            // ReturnPath: this.fromEmail,
        };

        try {
            const command = new SendEmailCommand(params);
            await this.sesClient.send(command);
            // logger.log('Verification email sent successfully');
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
            Source: this.fromEmail,
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: 'Reset your OpenMicGuru password',
                    Charset: 'UTF-8'
                },
                Body: {
                    Html: {
                        Data: `
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .button { background-color: #4CAF50; color: white; padding: 10px 20px; 
                                             text-decoration: none; border-radius: 4px; display: inline-block; }
                                    .footer { margin-top: 30px; font-size: 12px; color: #777; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>Password Reset Request</h1>
                                    <p>You requested to reset your password. Click the link below to create a new password:</p>
                                    <p><a href="${resetLink}" class="button">Reset Password</a></p>
                                    <p>Or copy and paste this link into your browser:</p>
                                    <p>${resetLink}</p>
                                    <p>This link will expire in 1 hour.</p>
                                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                                    <div class="footer">
                                        <p>&copy; ${new Date().getFullYear()} OpenMicGuru. All rights reserved.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `,
                        Charset: 'UTF-8'
                    },
                    Text: {
                        Data: `Reset your OpenMicGuru password by clicking this link: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
                        Charset: 'UTF-8'
                    }
                }
            }
            // Add configuration set if you've created one
            // ConfigurationSetName: 'EmailTracking',
        };

        try {
            const command = new SendEmailCommand(params);
            await this.sesClient.send(command);
            // logger.log('Password reset email sent successfully');
        } catch (error) {
            logger.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email. Please try again later.');
        }
    }
}

module.exports = new EmailService();
