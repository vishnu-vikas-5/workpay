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

// Static files & Standalone APK download distribution
const clientDist = path.join(__dirname, '../../client/dist');
const apkPath = path.join(clientDist, 'WorkPay.apk');

// Dedicated route to serve Android APK directly with correct APK mime-type & download disposition
app.get(['/WorkPay.apk', '/download/WorkPay.apk'], (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="WorkPay.apk"');
  res.sendFile(apkPath);
});

// Standalone download landing page (does not link back to website)
app.get(['/download', '/download-apk', '/download.html'], (req, res) => {
  res.sendFile(path.join(clientDist, 'download.html'));
});

// Serve frontend build assets if client/dist exists
app.use(express.static(clientDist));

// Catch-all for SPA navigation
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` WorkPay Backend Server running on port ${PORT}`);
  console.log(` Mode: ${razorpayXService.isLiveConfigured ? 'LIVE RazorpayX' : 'SANDBOX SIMULATOR (Safe Demo)'}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

