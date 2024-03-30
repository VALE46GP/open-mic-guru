require('dotenv').config();
console.log(process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors());
app.use(express.json());

routes(app);

// app.use(express.static(path.join(__dirname, '../frontend/build/index.html')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

