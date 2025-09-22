export interface PaymentReconciliationTest {
  id: string;
  paymentId: string;
  amount: number;
  reference?: string;
  result?: {
    matched: boolean;
    invoiceId?: string;
  };
  timestamp: string;
  status: "pending" | "completed" | "failed";
}

export interface PaymentSummary {
  totalProcessed: number;
  matchedPayments: number;
  unmatchedPayments: number;
  totalAmount: number;
}

export interface Invoice {
  invoiceId: string;
  number: string;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
  tenantId?: string;
  clientId?: string;
  daysPastDue?: number;
  reminderStage?: string;
}

export interface CollectionsSummary {
  totalOutstanding: number;
  overdueAmount: number;
  currentAmount: number;
  scheduledReminders: number;
  sentReminders: number;
}