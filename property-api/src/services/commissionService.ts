import { admin, firestore } from '../firebase';

type ListingType = 'cottage' | 'hotel' | 'vehicle' | 'horse' | 'snowmobile' | 'equipment';

export interface CommissionBooking {
  id: string;
  providerId: string;
  totalPrice: number;
  commissionAmount?: number;
  listingType?: string;
}

export interface PaymentDetails {
  method?: string;
  reference?: string;
}

export interface InvoiceSummary {
  totalEarnings: number;
  totalCommissions: number;
  unpaidAmount: number;
  invoiceCount: number;
  lastPaymentDate: string | null;
}

export interface InvoiceRecord {
  id: string;
  providerId: string;
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  bookings: string[];
  invoiceNumber: string;
}

export class CommissionService {
  private readonly db: any;

  private readonly defaultRates: Record<ListingType, number> = {
    hotel: 0.15,
    vehicle: 0.2,
    horse: 0.2,
    snowmobile: 0.2,
    equipment: 0.2,
    cottage: 0.15,
  };

  constructor(db: any) {
    this.db = db;
  }

  async calculateCommission(booking: CommissionBooking) {
    const provider = await this.db.collection('providers').doc(booking.providerId).get();
    if (!provider.exists) {
      throw new Error('Provider not found');
    }

    const providerData = provider.data() as Record<string, any>;
    const listingType = this.getListingType((booking.listingType ?? '').toLowerCase());

    const commissionRate = providerData?.customCommission?.rate
      ?? providerData?.defaultCommission?.rate
      ?? this.defaultRates[listingType];

    const commissionAmount = Math.round((booking.totalPrice * commissionRate) * 100) / 100;

    return {
      rate: commissionRate,
      amount: commissionAmount,
      totalPrice: booking.totalPrice,
    };
  }

  private getListingType(listingType: string): ListingType {
    const map: Record<string, ListingType> = {
      cottage: 'cottage',
      hotel: 'hotel',
      car: 'vehicle',
      vehicle: 'vehicle',
      horse: 'horse',
      snowmobile: 'snowmobile',
      equipment: 'equipment',
    };

    return map[listingType] ?? 'hotel';
  }

  async generateInvoices(periodStart: string, periodEnd: string): Promise<InvoiceRecord[]> {
    const bookingsQuery = await this.db.collection('bookings')
      .where('status', '==', 'completed')
      .where('completedDate', '>=', periodStart)
      .where('completedDate', '<=', periodEnd)
      .where('invoiceId', '==', null)
      .get();

    if (bookingsQuery.empty) {
      return [];
    }

    const bookingsByProvider = new Map<string, CommissionBooking[]>();
    bookingsQuery.docs.forEach((doc) => {
      const data = doc.data() as Record<string, any>;
      const providerId = data.providerId as string | undefined;
      if (!providerId) {
        return;
      }

      const booking: CommissionBooking = {
        id: doc.id,
        providerId,
        totalPrice: Number(data.totalPrice ?? 0),
        commissionAmount: Number(data.commissionAmount ?? 0),
        listingType: data.listingType as string | undefined,
      };

      const existing = bookingsByProvider.get(providerId) ?? [];
      existing.push(booking);
      bookingsByProvider.set(providerId, existing);
    });

    const invoices: InvoiceRecord[] = [];
    const batch = this.db.batch();

    for (const [providerId, bookings] of bookingsByProvider.entries()) {
      const totalAmount = bookings.reduce((sum, booking) => sum + (booking.commissionAmount ?? 0), 0);
      if (totalAmount <= 0) {
        continue;
      }

      const invoiceRef = this.db.collection('invoices').doc();
      const invoice: Omit<InvoiceRecord, 'id'> = {
        providerId,
        issueDate: new Date().toISOString().split('T')[0],
        periodStart,
        periodEnd,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status: 'unpaid',
        dueDate: this.calculateDueDate(new Date()),
        paidDate: null,
        bookings: bookings.map((booking) => booking.id),
        invoiceNumber: await this.generateInvoiceNumber(),
      };

      batch.set(invoiceRef, invoice);

      bookings.forEach((booking) => {
        const bookingRef = this.db.collection('bookings').doc(booking.id);
        batch.update(bookingRef, { invoiceId: invoiceRef.id });
      });

      const providerRef = this.db.collection('providers').doc(providerId);
      batch.update(providerRef, {
        totalOutstanding: admin.firestore.FieldValue.increment(invoice.totalAmount),
      });

      invoices.push({ id: invoiceRef.id, ...invoice });
    }

    await batch.commit();
    return invoices;
  }

  private calculateDueDate(issueDate: Date) {
    const due = new Date(issueDate);
    due.setDate(due.getDate() + 5);
    return due.toISOString().split('T')[0];
  }

  private async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const counterRef = this.db.collection('counters').doc('invoices');

    try {
      const result = await this.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(counterRef);
        let newCount = 1;

        if (snapshot.exists) {
          const data = snapshot.data() as { year?: number; count?: number };
          if (data.year === year) {
            newCount = (data.count ?? 0) + 1;
          }
        }

        transaction.set(counterRef, { year, count: newCount });
        return newCount;
      });

      return `INV-${year}-${result.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return `INV-${year}-${Date.now()}`;
    }
  }

  async enforcePayments() {
    const today = new Date().toISOString().split('T')[0];
    const overdueQuery = await this.db.collection('invoices')
      .where('status', '==', 'unpaid')
      .where('dueDate', '<', today)
      .get();

    if (overdueQuery.empty) {
      return;
    }

    const batch = this.db.batch();
    const suspendedProviders = new Set<string>();

    overdueQuery.docs.forEach((doc) => {
      const invoice = doc.data() as { providerId?: string };
      if (invoice.providerId) {
        suspendedProviders.add(invoice.providerId);
      }
      batch.update(doc.ref, { status: 'overdue' });
    });

    for (const providerId of suspendedProviders) {
      const providerRef = this.db.collection('providers').doc(providerId);
      batch.update(providerRef, { isBlocked: true, blockedDate: new Date() });

      const listingsQuery = await this.db.collection('listings')
        .where('providerId', '==', providerId)
        .get();

      listingsQuery.docs.forEach((listing) => {
        batch.update(listing.ref, { status: 'suspended' });
      });
    }

    await batch.commit();
  }

  async sendPaymentReminders() {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 2);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    const reminders = await this.db.collection('invoices')
      .where('status', '==', 'unpaid')
      .where('dueDate', '==', reminderDateStr)
      .get();

    if (reminders.empty) {
      return;
    }

    await Promise.all(reminders.docs.map(async (doc) => {
      const invoice = doc.data() as { providerId?: string; invoiceNumber?: string; totalAmount?: number; dueDate?: string };
      if (!invoice.providerId) {
        return;
      }

      const providerDoc = await this.db.collection('providers').doc(invoice.providerId).get();
      if (!providerDoc.exists) {
        return;
      }

      const provider = providerDoc.data() as { name?: string };
      console.log(`📧 Reminder sent to ${provider.name ?? providerDoc.id}: Invoice ${invoice.invoiceNumber ?? doc.id} (₾${invoice.totalAmount ?? 0}) due on ${invoice.dueDate}`);

      await doc.ref.update({
        reminderSent: true,
        reminderDate: new Date(),
      });
    }));
  }

  async markInvoicePaid(invoiceId: string, paymentDetails: PaymentDetails = {}) {
    const batch = this.db.batch();
    const invoiceRef = this.db.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceDoc.data() as { providerId: string; totalAmount: number; invoiceNumber?: string };

    batch.update(invoiceRef, {
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: paymentDetails.method ?? 'manual',
      paymentReference: paymentDetails.reference ?? null,
    });

    const providerRef = this.db.collection('providers').doc(invoice.providerId);
    batch.update(providerRef, {
      totalOutstanding: admin.firestore.FieldValue.increment(-invoice.totalAmount),
    });

    const unpaid = await this.db.collection('invoices')
      .where('providerId', '==', invoice.providerId)
      .where('status', 'in', ['unpaid', 'overdue'])
      .get();

    if (unpaid.docs.filter((doc) => doc.id !== invoiceId).length === 0) {
      batch.update(providerRef, { isBlocked: false, blockedDate: null });

      const listingsQuery = await this.db.collection('listings')
        .where('providerId', '==', invoice.providerId)
        .get();

      listingsQuery.docs.forEach((listing) => {
        batch.update(listing.ref, { status: 'active' });
      });
    }

    await batch.commit();
    console.log(`✅ Invoice ${invoice.invoiceNumber ?? invoiceId} marked as paid.`);
  }

  async getProviderCommissionSummary(providerId: string): Promise<InvoiceSummary> {
    const [invoicesQuery, bookingsQuery] = await Promise.all([
      this.db.collection('invoices').where('providerId', '==', providerId).get(),
      this.db.collection('bookings').where('providerId', '==', providerId).where('status', '==', 'completed').get(),
    ]);

    const invoices = invoicesQuery.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, any>) }));
    const totalEarnings = bookingsQuery.docs.reduce((sum, doc) => sum + Number((doc.data() as Record<string, any>).totalPrice ?? 0), 0);
    const totalCommissions = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    const unpaidAmount = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);

    const lastPaid = invoices
      .filter((invoice) => invoice.status === 'paid' && invoice.paidDate)
      .sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime())[0]?.paidDate ?? null;

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
      invoiceCount: invoices.length,
      lastPaymentDate: lastPaid ? String(lastPaid) : null,
    };
  }
}

export const commissionService = new CommissionService(firestore);
export default commissionService;
