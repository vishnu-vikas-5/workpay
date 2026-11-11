import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { payoutsRouter } from './routes/payouts';
import { razorpayXService } from './services/razorpayx';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health & Status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'WorkPay Payout & Integration API',
    version: '1.0.0',
    mode: razorpayXService.isLiveConfigured ? 'Live RazorpayX' : 'Sandbox Demo Simulator',
    timestamp: new Date().toISOString(),
  });
});

// Payouts router
app.use('/api/payouts', payoutsRouter);

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` WorkPay Backend Server running on port ${PORT}`);
  console.log(` Mode: ${razorpayXService.isLiveConfigured ? 'LIVE RazorpayX' : 'SANDBOX SIMULATOR (Safe Demo)'}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

