require('dotenv').config();
console.log(process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Passport
const passport = require('passport');
app.use(passport.initialize());

routes(app);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
