import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import apiRoutes from './routes/api';
import { initCronJobs, runInitialSeed } from './jobs/scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rate Limiting (Anti-Spam)
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // limit each IP to 15 requests per windowMs
  message: { error: 'Demasiadas simulações efetuadas. Por favor, tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use('/api', apiLimiter, apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Mais Energia Backend is running.' });
});

// Initialize Cron Jobs
initCronJobs();
// Run initial seed immediately to populate the real database
runInitialSeed();

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
