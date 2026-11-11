import { Router, Request, Response } from 'express';
import { razorpayXService } from '../services/razorpayx';

export const payoutsRouter = Router();

// Initiate a payout
payoutsRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      payrollId,
      employeeId,
      employeeName,
      employeeCode,
      amount,
      paymentMethod,
      destination,
      idempotencyKey,
      notes,
    } = req.body;

    if (!payrollId || !employeeId || !amount || !destination || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing mandatory fields (payrollId, employeeId, amount, destination, idempotencyKey)',
      });
    }

    const result = await razorpayXService.processPayout({
      payrollId,
      employeeId,
      employeeName,
      employeeCode,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'razorpayx_upi',
      destination,
      idempotencyKey,
      notes,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Payout route error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while processing payout',
    });
  }
});

// RazorpayX Webhook Receiver
payoutsRouter.post('/webhook', (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    const isValid = razorpayXService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Webhook] Invalid Razorpay signature rejected.');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`[RazorpayX Webhook Received] Event: ${event}`);

    // Events: payout.processed, payout.failed, payout.reversed, payout.initiated
    return res.status(200).json({ status: 'ok', receivedEvent: event });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Simulate webhook for local sandbox test
payoutsRouter.post('/simulate-webhook', (req: Request, res: Response) => {
  const { event, payoutId, utr, failureReason } = req.body;
  console.log(`[Simulated Webhook] Event: ${event}, Payout: ${payoutId}`);

  return res.status(200).json({
    success: true,
    message: `Simulated webhook for event ${event} executed successfully.`,
    simulatedData: {
      event: event || 'payout.processed',
      payoutId: payoutId || 'pout_sim_123',
      utr: utr || `UTR${Date.now()}`,
      failureReason: failureReason || null,
      timestamp: new Date().toISOString(),
    },
  });
});

