const userRoutes = require('./users');
const eventRoutes = require('./events');
const testdbRoutes = require('./testdb');
const venueRoutes = require('./venues');
const authRoutes = require('./auth');
const path = require("path");

module.exports = (app) => {
    app.use('/users', userRoutes);
    app.use('/events', eventRoutes);
    app.use('/venues', venueRoutes);
    app.use('/auth', authRoutes);
    app.use(testdbRoutes);

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/src/index.html'));
    });
};
