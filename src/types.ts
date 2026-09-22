export type Role = 'superadmin' | 'admin' | 'support' | 'accounting';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  permissions: string[];
}

export interface OrderItem {
  id: string;
  reference: string;
  customerPhone: string;
  amount: number;
  vendAmount: number;
  serviceFee: number;
  buypowerCommission?: number;
  monnifyFee?: number;
  netProfit?: number;
  status: 'pending_payment' | 'processing' | 'success' | 'failed';
  disco: string;
  meterNumber: string;
  meterName: string;
  token?: string;
  units?: string | number;
  provider?: string;
  requiresManualIntervention: boolean;
  fulfillmentFailureReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoHealth {
  disco: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  totalOrders: number;
  successOrders: number;
  failedOrders: number;
  successRate: number;
}

export interface DashboardStats {
  kpis: {
    totalRevenue: number;
    totalVendAmount: number;
    totalServiceFees: number;
    totalBuyPowerCommission: number;
    totalMonnifyFees: number;
    netProfit: number;
    totalOrders: number;
    successOrders: number;
    pendingOrders: number;
    interventionRequired: number;
    successRate: number;
    totalUnitsDelivered: number;
    today: {
      ordersCount: number;
      customerPaid: number;
      vendAmount: number;
      netProfit: number;
    };
  };
  wallet: {
    provider: string;
    balance: number;
    commissionBalance: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  monnifyWallet?: {
    provider: string;
    availableBalance: number;
    ledgerBalance: number;
  };
}

export interface OrderTrend {
  date: string;
  totalSales: number;
  ordersCount: number;
  successCount: number;
  netProfit: number;
}

export interface DailyLedgerRow {
  date: string;
  ordersCount: number;
  grossCustomerPaid: number;
  discoEnergyCost: number;
  serviceFeeRevenue: number;
  buypowerCommission: number;
  monnifyFees: number;
  netProfit: number;
}

export interface AccountingSummary {
  summary: {
    totalOrders: number;
    grossCustomerPaid: number;
    discoEnergyCost: number;
    serviceFeeRevenue: number;
    buypowerCommission: number;
    monnifyFees: number;
    netProfitMargin: number;
  };
  buypowerWallet: {
    balance: number;
    commissionBalance: number;
  };
  monnifyWallet?: {
    availableBalance: number;
    ledgerBalance: number;
  };
  ledger: DailyLedgerRow[];
}

export interface MonnifyVerificationData {
  paymentReference?: string;
  transactionReference?: string;
  amountPaid?: number;
  payableAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  fee?: number;
  settlementAmount?: number;
  paidOn?: string;
}

export interface Customer {
  id: string;
  phoneNumber: string;
  name: string;
  meters: Array<{
    meterNumber: string;
    disco: string;
    name: string;
    address: string;
    vendType: string;
  }>;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface SupportMessage {
  sender: 'customer' | 'agent' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  _id: string;
  ticketId: string;
  customerPhone: string;
  customerName?: string;
  status: 'open' | 'pending_agent' | 'pending_customer' | 'resolved';
  meterNo?: string;
  disco?: string;
  lastOrderRef?: string;
  messages: SupportMessage[];
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lastMessageAt: string;
  inactivityWarningSentAt?: string;
  resolutionReason?: 'agent' | 'customer_exit' | 'inactivity_timeout';
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetails {
  ticket: SupportTicket;
  customerContext: {
    phone: string;
    name?: string;
    meterNo?: string;
    disco?: string;
    recentOrders: OrderItem[];
  };
}

