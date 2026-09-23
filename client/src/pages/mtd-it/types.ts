export interface MtdTask {
  id: string;
  quarterId: number | null;
  clientId: number;
  clientName: string;
  mtdClientId: number;
  sourceId: number | null;
  sourceType: "self-employment" | "uk-property" | "foreign-property" | "consolidated";
  tradingName: string;
  workflowType: string;
  taskName: string;
  quarterNumber?: number;
  startDate?: string;
  endDate?: string;
  dueDate: string;
  taskStatus: "Open" | "Overdue" | "Submitted" | "Draft";
  lastSubmissionDate: string | null;
  clientApprovalStatus: "Not Sent" | "Sent" | "Approved" | "Resend";
  grossIncome?: string;
  netProfit?: string;
  canSubmit: boolean;
  type: "quarter" | "adjustment" | "final";
  taxYear?: string;
}

export interface MtdClientRecord {
  id: number;
  clientId: number;
  clientCode?: string;
  clientName: string;
  clientType: string;
  utrNumber?: string;
  nino?: string;
  mtdStatus: string;
  agentAuthorised: boolean;
  asaStatus: string;
  calendarType: "standard" | "calendar";
  reportingMethod: "three_line" | "detailed";
  sourcesCount: number;
  sources: MtdSourceRecord[];
  createdAt: string;
}

export interface MtdSourceRecord {
  id: number;
  clientId: number;
  mtdClientId?: number;
  sourceType: "self-employment" | "uk-property" | "foreign-property";
  businessId?: string;
  tradingName: string;
  accountingType: "Cash basis" | "Accruals basis";
  commencementDate?: string;
  cessationDate?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  country?: string;
  workflowType: "workflow_1_bridging" | "workflow_2_365" | "workflow_3_365_bookkeeping" | "workflow_4_bookkeeping";
  calendarType: "standard" | "calendar";
  reportingMethod: "three_line" | "detailed";
  sharedOwnershipPct: string;
  isActive: boolean;
}

export interface MtdDigitalRecord {
  id: number;
  sourceId: number;
  quarterId?: number;
  recordDate: string;
  invoiceNumber?: string;
  amount: string;
  sourceType: string;
  category: string;
  recordType: "Income" | "Expense";
  description?: string;
  isDisallowable: boolean;
  createdVia: string;
}

export interface MtdQuarterSummary {
  sourceId: number;
  quarterNumber: number;
  taxYear: string;
  reportingMethod: "three_line" | "detailed";
  threeLine: {
    turnover: string;
    allowableExpenses: string;
    netProfit: string;
  };
  detailed: {
    grossIncome: string;
    allowableExpenses: string;
    disallowableExpenses: string;
    netProfit: string;
    categoryBreakdown: Record<string, { allowable: number; disallowable: number }>;
  };
  ytdSummary: {
    q1: { turnover: string; expenses: string; net: string };
    q2: { turnover: string; expenses: string; net: string };
    q3: { turnover: string; expenses: string; net: string };
    q4: { turnover: string; expenses: string; net: string };
    cumulative: {
      turnover: string;
      expenses: string;
      netProfit: string;
    };
  };
  sharedOwnershipPct?: string;
  isSharedOwnership?: boolean;
  grossFull?: {
    turnover: string;
    allowableExpenses: string;
    disallowableExpenses: string;
    netProfit: string;
    categoryBreakdown: Record<string, { allowable: number; disallowable: number }>;
  };
}

export interface MtdAdjustmentsRecord {
  id?: number;
  mtdClientId?: number;
  sourceId: number;
  taxYear: string;
  includedNonTaxableProfits: string;
  basisAdjustment: string;
  outstandingBusinessIncome: string;
  overlapReliefUsed: string;
  balancingChargeBpra: string;
  accountingAdjustment: string;
  balancingChargeOther: string;
  goodsServicesOwnUse: string;
  privateUseAdjustment: string;
  annualInvestmentAllowance: string;
  enhancedCapitalAllowance: string;
  bpra: string;
  allowanceOnSales: string;
  capitalAllowanceMainPool: string;
  capitalAllowanceSingleAsset: string;
  capitalAllowanceSpecialRate: string;
  tradingAllowance: string;
  propertyAllowance: string;
  zeroEmissionVehicleAllowance: string;
  replacingDomesticItemsAllowance: string;
  class4NicExempt: boolean;
  status?: string;
  submittedAt?: string;
  hmrcSubmissionId?: string;
}

export interface MtdDividendRecord {
  id: number;
  clientId: number;
  mtdClientId?: number;
  taxYear: string;
  companyName: string;
  sharesHeld: string;
  dividendRate: string;
  totalDividend: string;
  taxCredit: string;
  currency?: string;
}
