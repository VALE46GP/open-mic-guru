const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const authController = {
    initializeGoogleStrategy() {
        passport.use(new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/auth/google/callback"
            },
            function(accessToken, refreshToken, profile, cb) {
                // Callback function after successful Google authentication
                return cb(null, profile);
            }));
    },

    authenticateGoogle(req, res, next) {
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })(req, res, next);
    },

    handleGoogleCallback(req, res, next) {
        passport.authenticate('google', {
            failureRedirect: '/login'
        })(req, res, next);
    },

    handleSuccessRedirect(req, res) {
        res.redirect('/'); // Redirect to home on success
    }
};

module.exports = authController;