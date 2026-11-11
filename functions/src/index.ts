import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

/**
 * RazorpayX Webhook Handler
 * Verifies HMAC SHA-256 signature and updates Firestore transaction and payroll states.
 */
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const webhookSecret = process.env.RAZORPAYX_WEBHOOK_SECRET || functions.config().razorpayx?.webhook_secret;
  const signature = req.headers['x-razorpay-signature'] as string;

  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid signature on RazorpayX webhook');
      res.status(400).send('Invalid signature');
      return;
    }
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`[Cloud Function Webhook] Processing event: ${event}`);

  if (event === 'payout.processed') {
    const payout = payload?.payout?.entity;
    if (payout) {
      const payoutId = payout.id;
      const utr = payout.utr;

      // Find matching transaction in payments collection
      const snap = await db.collection('payments').where('razorpayPayoutId', '==', payoutId).get();
      if (!snap.empty) {
        const txDoc = snap.docs[0];
        const txData = txDoc.data();

        await txDoc.ref.update({
          status: 'Successful',
          providerReferenceId: utr,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          webhookLogs: admin.firestore.FieldValue.arrayUnion({
            event: 'payout.processed',
            timestamp: new Date().toISOString(),
            status: 'Successful',
            notes: `Credited via webhook. UTR: ${utr}`,
          }),
        });

        // Also update matching payroll record
        if (txData.payrollId) {
          await db.collection('payroll').doc(txData.payrollId).update({
            paymentStatus: 'paid',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }
  } else if (event === 'payout.failed' || event === 'payout.reversed') {
    const payout = payload?.payout?.entity;
    if (payout) {
      const payoutId = payout.id;
      const snap = await db.collection('payments').where('razorpayPayoutId', '==', payoutId).get();
      if (!snap.empty) {
        const txDoc = snap.docs[0];
        const txData = txDoc.data();

        await txDoc.ref.update({
          status: event === 'payout.failed' ? 'Failed' : 'Reversed',
          failureReason: payout.failure_reason || 'Bank processing error',
        });

        if (txData.payrollId) {
          await db.collection('payroll').doc(txData.payrollId).update({
            paymentStatus: 'failed',
          });
        }
      }
    }
  }

  res.status(200).json({ status: 'ok' });
});

/**
 * Trigger when Overtime Request is updated to notify employee
 */
export const onOvertimeStatusChanged = functions.firestore
  .document('overtime_requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status) {
      await db.collection('notifications').add({
        userId: after.employeeId,
        title: `Overtime ${after.status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your overtime request for ${after.date} was marked ${after.status} by ${after.approvedBy || 'supervisor'}.`,
        type: after.status === 'approved' ? 'overtime_approved' : 'system',
        link: '/employee-dashboard',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

