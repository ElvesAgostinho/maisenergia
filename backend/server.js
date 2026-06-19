require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/api/routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota base para teste (status da API)
app.get('/', (req, res) => {
  res.send('API Mais Energia está Online! 🚀');
});

// Main Routes
app.use('/api', routes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${port}`);
});
