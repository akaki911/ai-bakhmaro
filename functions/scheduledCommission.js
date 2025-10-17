
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Property API integration
const fetch = (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

const PROPERTY_API_URL = process.env.PROPERTY_API_URL || 'http://127.0.0.1:5100';
const PROPERTY_API_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || process.env.PROPERTY_INTERNAL_TOKEN || process.env.AI_INTERNAL_TOKEN;

async function propertyApiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (PROPERTY_API_TOKEN) {
    headers['X-Internal-Token'] = PROPERTY_API_TOKEN;
  }

  const response = await fetch(`${PROPERTY_API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Property API ${path} failed (${response.status}): ${payload}`);
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Scheduled function to generate invoices (runs on 1st and 15th of each month)
exports.generateInvoicesScheduled = functions.pubsub
  .schedule('0 2 1,15 * *') // Run at 2 AM on 1st and 15th of every month
  .timeZone('Asia/Tbilisi')
  .onRun(async (context) => {
    try {
      console.log('🕐 Starting scheduled invoice generation...');
      
      const now = new Date();
      const isFirstHalf = now.getDate() === 1;
      
      let periodStart, periodEnd;
      
      if (isFirstHalf) {
        // Generate for second half of previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 16);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        periodStart = prevMonth.toISOString().split('T')[0];
        periodEnd = lastDay.toISOString().split('T')[0];
      } else {
        // Generate for first half of current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0];
      }

      const result = await propertyApiRequest('/commission/generate-invoices', {
        method: 'POST',
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      console.log(`✅ Generated ${result?.count ?? 0} invoices for period ${periodStart} to ${periodEnd}`);
      
      return null;
    } catch (error) {
      console.error('❌ Error in scheduled invoice generation:', error);
      throw error;
    }
  });

// Scheduled function to send payment reminders (runs daily at 9 AM)
exports.sendPaymentRemindersScheduled = functions.pubsub
  .schedule('0 9 * * *') // Run at 9 AM every day
  .timeZone('Asia/Tbilisi')
  .onRun(async (context) => {
    try {
      console.log('📧 Starting scheduled payment reminders...');
      
      await propertyApiRequest('/commission/send-reminders', { method: 'POST' });
      console.log('✅ Payment reminders sent successfully');
      
      return null;
    } catch (error) {
      console.error('❌ Error sending payment reminders:', error);
      throw error;
    }
  });

// Scheduled function to enforce payments (runs daily at 10 AM)
exports.enforcePaymentsScheduled = functions.pubsub
  .schedule('0 10 * * *') // Run at 10 AM every day
  .timeZone('Asia/Tbilisi')
  .onRun(async (context) => {
    try {
      console.log('⚖️ Starting scheduled payment enforcement...');
      
      await propertyApiRequest('/commission/enforce-payments', { method: 'POST' });
      console.log('✅ Payment enforcement completed successfully');
      
      return null;
    } catch (error) {
      console.error('❌ Error in payment enforcement:', error);
      throw error;
    }
  });

// Trigger function to calculate commission when booking is completed
exports.onBookingCompleted = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    try {
      const newValue = change.after.data();
      const previousValue = change.before.data();
      
      // Check if booking status changed to completed
      if (newValue.status === 'completed' && previousValue.status !== 'completed') {
        console.log(`📋 Booking ${context.params.bookingId} completed, calculating commission...`);
        
        const result = await propertyApiRequest('/commission/calculate', {
          method: 'POST',
          body: JSON.stringify({
            providerId: newValue.providerId,
            totalPrice: newValue.totalPrice,
            listingType: newValue.listingType || 'hotel',
          }),
        });

        const commission = result?.commission;

        if (commission) {
          await change.after.ref.update({
            commissionRate: commission.rate,
            commissionAmount: commission.amount,
            completedDate: new Date().toISOString().split('T')[0]
          });

          console.log(`✅ Commission calculated for booking ${context.params.bookingId}: ₾${commission.amount}`);
        } else {
          console.warn(`⚠️ Commission calculation returned no result for booking ${context.params.bookingId}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error calculating commission for booking:', error);
      throw error;
    }
  });

// Function to handle invoice payment webhooks (for payment gateway integration)
exports.handleInvoicePayment = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    const { invoiceId, paymentMethod, reference, amount } = req.body;
    
    if (!invoiceId) {
      return res.status(400).send('Invoice ID required');
    }
    
    console.log(`💳 Processing payment for invoice ${invoiceId}`);
    
    await propertyApiRequest(`/commission/invoices/${invoiceId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({
        method: paymentMethod || 'webhook',
        reference,
      }),
    });
    
    console.log(`✅ Payment processed for invoice ${invoiceId}`);
    
    res.status(200).json({ success: true, message: 'Payment processed successfully' });
  } catch (error) {
    console.error('❌ Error processing payment webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to update provider commission rates
exports.updateProviderCommissionRate = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'User must be admin');
    }
    
    const { providerId, rate, model = 'percentage' } = data;
    
    if (!providerId || !rate || rate < 0 || rate > 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid provider ID or commission rate');
    }
    
    await db.collection('providers').doc(providerId).update({
      customCommission: { model, rate },
      updatedAt: new Date(),
      updatedBy: context.auth.uid
    });
    
    console.log(`✅ Updated commission rate for provider ${providerId} to ${rate * 100}%`);
    
    return { success: true, message: 'Commission rate updated successfully' };
  } catch (error) {
    console.error('❌ Error updating commission rate:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
