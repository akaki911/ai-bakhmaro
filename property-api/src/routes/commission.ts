import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { getEnv } from '../env';
import { admin } from '../firebase';
import { extractForwardedBearer } from '../middleware/serviceAuth';
import commissionService, { type PaymentDetails } from '../services/commissionService';

const env = getEnv();

const router = express.Router();

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const internalToken = req.headers['x-internal-token'] ?? req.headers['x-ai-internal-token'];
    if (env.INTERNAL_SERVICE_TOKEN && typeof internalToken === 'string' && internalToken === env.INTERNAL_SERVICE_TOKEN) {
      (req as Request & { user?: unknown }).user = { role: 'service' };
      return next();
    }

    if (!res.locals.serviceToken) {
      return res.status(401).json({ error: 'Missing gateway service credentials' });
    }

    const token = extractForwardedBearer(req);
    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as Request & { user?: unknown }).user = { uid: decodedToken.uid, ...userDoc.data() };
    return next();
  } catch (error) {
    console.error('Admin authentication failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/generate-invoices', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { periodStart, periodEnd } = req.body as { periodStart?: string; periodEnd?: string };

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Period start and end dates required' });
    }

    const invoices = await commissionService.generateInvoices(periodStart, periodEnd);
    return res.json({ success: true, invoices, count: invoices.length });
  } catch (error) {
    console.error('Error generating invoices:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/calculate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { providerId, totalPrice, listingType } = req.body as { providerId?: string; totalPrice?: number; listingType?: string };

    if (!providerId || typeof totalPrice !== 'number') {
      return res.status(400).json({ error: 'Provider ID and total price are required' });
    }

    const commission = await commissionService.calculateCommission({
      id: 'virtual',
      providerId,
      totalPrice,
      listingType,
    });

    return res.json({ commission });
  } catch (error) {
    console.error('Error calculating commission:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/invoices', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { providerId, status, limit = '50', offset = '0' } = req.query as Record<string, string>;

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = admin
      .firestore()
      .collection('invoices');

    if (providerId) {
      query = query.where('providerId', '==', providerId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('issueDate', 'desc').limit(Number(limit)).offset(Number(offset));

    const snapshot = await query.get();
    const invoices = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const providerIds = [...new Set(invoices.map((invoice: any) => invoice.providerId))] as string[];
    const providers: Record<string, string> = {};

    if (providerIds.length > 0) {
      const providerDocs = await admin.firestore().getAll(...providerIds.map((id) => admin.firestore().collection('providers').doc(id)));
      providerDocs.forEach((doc: any) => {
        if (doc.exists) {
          providers[doc.id] = (doc.data() as Record<string, any>).name as string ?? 'Unknown';
        }
      });
    }

    invoices.forEach((invoice: any) => {
      (invoice as Record<string, any>).providerName = providers[invoice.providerId] ?? 'Unknown';
    });

    return res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/invoices/:invoiceId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoiceDoc = await admin.firestore().collection('invoices').doc(invoiceId).get();

    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as Record<string, any>;
    const providerDoc = await admin.firestore().collection('providers').doc(invoice.providerId).get();
    invoice.provider = providerDoc.exists ? providerDoc.data() : null;

    if (Array.isArray(invoice.bookings) && invoice.bookings.length > 0) {
      const bookingDocs = await admin.firestore().getAll(...invoice.bookings.map((id: string) => admin.firestore().collection('bookings').doc(id)));
      invoice.bookingDetails = bookingDocs.map((doc: any) => (doc.exists ? { id: doc.id, ...doc.data() } : null)).filter(Boolean);
    }

    return res.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/invoices/:invoiceId/mark-paid', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { method, reference } = req.body as PaymentDetails;

    await commissionService.markInvoicePaid(invoiceId, { method, reference });
    return res.json({ success: true, message: 'Invoice marked as paid' });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/provider/:providerId/summary', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const token = extractForwardedBearer(req);

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || ((userDoc.data()?.role !== 'admin') && (userDoc.data()?.providerId !== providerId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const summary = await commissionService.getProviderCommissionSummary(providerId);
    return res.json({ summary });
  } catch (error) {
    console.error('Error getting provider summary:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/provider/:providerId/invoices', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const token = extractForwardedBearer(req);

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || ((userDoc.data()?.role !== 'admin') && (userDoc.data()?.providerId !== providerId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await admin.firestore().collection('invoices')
      .where('providerId', '==', providerId)
      .orderBy('issueDate', 'desc')
      .get();

    const invoices = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return res.json({ invoices });
  } catch (error) {
    console.error('Error fetching provider invoices:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/provider/:providerId/commission-rate', requireAdmin, async (req: any, res: any) => {
  try {
    const { providerId } = req.params;
    const { rate, model = 'percentage' } = req.body as { rate?: number; model?: string };

    if (typeof rate !== 'number' || rate <= 0 || rate > 1) {
      return res.status(400).json({ error: 'Invalid commission rate' });
    }

    await admin.firestore().collection('providers').doc(providerId).update({
      customCommission: { model, rate },
      updatedAt: new Date(),
    });

    return res.json({ success: true, message: 'Commission rate updated' });
  } catch (error) {
    console.error('Error updating commission rate:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/enforce-payments', requireAdmin, async (_req: any, res: any) => {
  try {
    await commissionService.enforcePayments();
    return res.json({ success: true, message: 'Payment enforcement completed' });
  } catch (error) {
    console.error('Error enforcing payments:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/send-reminders', requireAdmin, async (_req: any, res: any) => {
  try {
    await commissionService.sendPaymentReminders();
    return res.json({ success: true, message: 'Payment reminders sent' });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/stats', requireAdmin, async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = admin
      .firestore()
      .collection('invoices');

    if (startDate) {
      query = query.where('issueDate', '>=', startDate);
    }

    if (endDate) {
      query = query.where('issueDate', '<=', endDate);
    }

    const snapshot = await query.get();
    const invoices = snapshot.docs.map((doc) => doc.data() as Record<string, any>);

    const stats = {
      totalInvoices: invoices.length,
      totalCommission: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
      paidCommission: invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
      unpaidCommission: invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
      overdueInvoices: invoices.filter((invoice) => invoice.status === 'overdue').length,
    };

    stats.totalCommission = Math.round(stats.totalCommission * 100) / 100;
    stats.paidCommission = Math.round(stats.paidCommission * 100) / 100;
    stats.unpaidCommission = Math.round(stats.unpaidCommission * 100) / 100;

    return res.json({ stats });
  } catch (error) {
    console.error('Error fetching commission stats:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
