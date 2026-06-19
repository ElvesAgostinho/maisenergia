require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/api/routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api', routes);

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
