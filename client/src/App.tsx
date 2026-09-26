import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { useAuth } from "./hooks/useAuth";
import { ConfirmProvider } from "./hooks/useConfirm";
import MaintenanceModePage from "./pages/MaintenanceModePage";

// Pages
import LoginPage from "./pages/auth/LoginPage";
import EcosystemDashboard from "./pages/ecosystem/EcosystemDashboard";
import PracticeManagement from "./pages/practice/PracticeManagement";
import MyAdminPage from "./pages/admin/MyAdminPage";
import BookkeepingHome from "./pages/bookkeeping/BookkeepingHome";
import InvoicesPage from "./pages/bookkeeping/InvoicesPage";
import PurchasesPage from "./pages/bookkeeping/PurchasesPage";
import BankPage from "./pages/bookkeeping/BankPage";
import VatPage from "./pages/bookkeeping/VatPage";
import ChartOfAccountsPage from "./pages/bookkeeping/ChartOfAccountsPage";
import PayrollHome from "./pages/payroll/PayrollHome";
import EmployeesPage from "./pages/payroll/EmployeesPage";
import PayRunsPage from "./pages/payroll/PayRunsPage";
import PayrollSettingsPage from "./pages/payroll/PayrollSettingsPage";
import PayrollRtiPage from "./pages/payroll/PayrollRtiPage";
import ClientPayrollDashboard from "./pages/payroll/workspace/ClientPayrollDashboard";
import DepartmentsPage from "./pages/payroll/workspace/DepartmentsPage";
import AdditionalPayPage from "./pages/payroll/workspace/AdditionalPayPage";
import TimekeepingPage from "./pages/payroll/workspace/TimekeepingPage";
import AutoEnrolmentPage from "./pages/payroll/workspace/AutoEnrolmentPage";
import PayrollSubmissionsPage from "./pages/payroll/workspace/PayrollSubmissionsPage";
import P11dFormsPage from "./pages/payroll/workspace/P11dFormsPage";
import PayrollReportsPage from "./pages/payroll/workspace/PayrollReportsPage";
import BulkPayrollPage from "./pages/payroll/bulk/BulkPayrollPage";
import HmrcCallbackPage from "./pages/settings/HmrcCallbackPage";
import AccountsProductionHome from "./pages/accounts-production/AccountsProductionHome";
import CorporationTaxHome from "./pages/corporation-tax/CorporationTaxHome";
import SelfAssessmentHome from "./pages/self-assessment/SelfAssessmentHome";
import TasksPage from "./pages/practice/TasksPage";
import CrmPage from "./pages/practice/CrmPage";
import PracticeClientsPage from "./pages/practice/PracticeClientsPage";
import CrmConnectionsPage from "./pages/practice/CrmConnectionsPage";
import CrmCommunicationsPage from "./pages/practice/CrmCommunicationsPage";
import DeadlinesPage from "./pages/practice/DeadlinesPage";
import ServicesPage from "./pages/practice/ServicesPage";
import ConversationsPage from "./pages/practice/ConversationsPage";
import CommunicationPage from "./pages/practice/CommunicationPage";
import ProposalsPage from "./pages/practice/ProposalsPage";
import PublicSigningPage from "./pages/practice/PublicSigningPage";
import DocumentRequestsPage from "./pages/practice/DocumentRequestsPage";
import PracticeReportsPage from "./pages/practice/PracticeReportsPage";
import PracticeSettingsPage from "./pages/practice/PracticeSettingsPage";
import PracticeTeamPage from "./pages/practice/PracticeTeamPage";
import PracticeeSignPage from "./pages/practice/PracticeeSignPage";
import ClientDetailsPage from "./pages/practice/ClientDetailsPage";
import ActivityPage from "./pages/practice/ActivityPage";
import ContactsPage from "./pages/bookkeeping/ContactsPage";
import ReportsPage from "./pages/bookkeeping/ReportsPage";
import ClientProfilePage from "./pages/bookkeeping/ClientProfilePage";
import TrialBalancePage from "./pages/accounts-production/TrialBalancePage";
import ReportSettingsPage from "./pages/accounts-production/ReportSettingsPage";
import AccountsSubmissionPage from "./pages/accounts-production/AccountsSubmissionPage";
import ClientWorkspacePage from "./pages/accounts-production/ClientWorkspacePage";
import WorkspaceDashboardPage from "./pages/accounts-production/workspace/WorkspaceDashboardPage";
import StatementsPage from "./pages/accounts-production/workspace/StatementsPage";
import StatutoryNotesPage from "./pages/accounts-production/workspace/StatutoryNotesPage";
import AccountingPoliciesPage from "./pages/accounts-production/workspace/AccountingPoliciesPage";
import ChartOfAccountsWorkspacePage from "./pages/accounts-production/workspace/ChartOfAccountsWorkspacePage";
import TrialBalanceWorkspacePage from "./pages/accounts-production/workspace/TrialBalanceWorkspacePage";
import IxbrlFilingPage from "./pages/accounts-production/workspace/IxbrlFilingPage";
import eSignWorkspacePage from "./pages/accounts-production/workspace/eSignWorkspacePage";
import ReportsPackPage from "./pages/accounts-production/workspace/ReportsPackPage";
import TasksWorkspacePage from "./pages/accounts-production/workspace/TasksWorkspacePage";
import ChApiWorkspacePage from "./pages/accounts-production/workspace/ChApiWorkspacePage";
import DirectorsWorkspacePage from "./pages/accounts-production/workspace/DirectorsWorkspacePage";
import AuditLogsWorkspacePage from "./pages/accounts-production/workspace/AuditLogsWorkspacePage";
import CT600Form from "./pages/corporation-tax/CT600Form";
import CTClientWorkspacePage from "./pages/corporation-tax/workspace/CTClientWorkspacePage";
import CTDashboardPage from "./pages/corporation-tax/workspace/CTDashboardPage";
import CTComputationPage from "./pages/corporation-tax/workspace/CTComputationPage";
import CTCalculatorsPage from "./pages/corporation-tax/workspace/CTCalculatorsPage";
import CTSupplementaryPage from "./pages/corporation-tax/workspace/CTSupplementaryPage";
import CTAttachmentsPage from "./pages/corporation-tax/workspace/CTAttachmentsPage";
import CTTaxDuePage from "./pages/corporation-tax/workspace/CTTaxDuePage";
import CTeSignPage from "./pages/corporation-tax/workspace/CTeSignPage";
import CTSubmitPage from "./pages/corporation-tax/workspace/CTSubmitPage";
import SA100Form from "./pages/self-assessment/SA100Form";
import SA800Form from "./pages/self-assessment/SA800Form";
import ClientQuestionnaire from "./pages/self-assessment/ClientQuestionnaire";
import SAClientWorkspacePage from "./pages/self-assessment/workspace/SAClientWorkspacePage";
import SADashboardPage from "./pages/self-assessment/workspace/SADashboardPage";
import SAFormsPage from "./pages/self-assessment/workspace/SAFormsPage";
import SASchedulesPage from "./pages/self-assessment/workspace/SASchedulesPage";
import SACalculatorsPage from "./pages/self-assessment/workspace/SACalculatorsPage";
import SACalculationPage from "./pages/self-assessment/workspace/SACalculationPage";
import SAPoaPage from "./pages/self-assessment/workspace/SAPoaPage";
import SATaxDuePage from "./pages/self-assessment/workspace/SATaxDuePage";
import SAQuestionnairePage from "./pages/self-assessment/workspace/SAQuestionnairePage";
import SAeSignPage from "./pages/self-assessment/workspace/SAeSignPage";
import SASubmitPage from "./pages/self-assessment/workspace/SASubmitPage";
import SelfAssessmentSettingsPage from "./pages/self-assessment/SelfAssessmentSettingsPage";
import BookkeepingSettingsPage from "./pages/bookkeeping/BookkeepingSettingsPage";
import CompanyInfoPage from "./pages/bookkeeping/settings/CompanyInfoPage";
import AccountingPeriodsPage from "./pages/bookkeeping/settings/AccountingPeriodsPage";
import ChartOfAccountsSettingsPage from "./pages/bookkeeping/settings/ChartOfAccountsSettingsPage";
import CompanyLogoPage from "./pages/bookkeeping/settings/CompanyLogoPage";
import OpeningBalancePage from "./pages/bookkeeping/settings/OpeningBalancePage";
import CurrencyPage from "./pages/bookkeeping/settings/CurrencyPage";
import CustomiseSequencePage from "./pages/bookkeeping/settings/CustomiseSequencePage";
import CharityAccountsHome from "./pages/charity/CharityAccountsHome";
import CharityDashboardPage from "./pages/charity/workspace/CharityDashboardPage";
import CharityFundsPage from "./pages/charity/workspace/CharityFundsPage";
import CharityDonationsPage from "./pages/charity/workspace/CharityDonationsPage";
import CharityAccountsProductionPage from "./pages/charity/workspace/CharityAccountsProductionPage";
import CharityBookkeepingPage from "./pages/charity/workspace/CharityBookkeepingPage";
import CharityManagePage from "./pages/charity/workspace/CharityManagePage";
import MtdItHome from "./pages/mtd-it/MtdItHome";
import CompanySecretarialHome from "./pages/company-secretarial/CompanySecretarialHome";
import Portal365Home from "./pages/portal-365/Portal365Home";
import EsignHome from "./pages/esign/EsignHome";
import PublicSignPage from "./pages/esign/PublicSignPage";
import AcceptInvitePage from "./pages/portal-365/AcceptInvitePage";
import ClientPortalDashboard from "./pages/portal-365/ClientPortalDashboard";
import Client365WorkspacePage from "./pages/portal-365/Client365WorkspacePage";
import SmeDashboardPage from "./pages/sme/SmeDashboardPage";
import SmeInvoicesPage from "./pages/sme/SmeInvoicesPage";
import SmePurchasesPage from "./pages/sme/SmePurchasesPage";
import SmeBankPage from "./pages/sme/SmeBankPage";
import SmePayrollPage from "./pages/sme/SmePayrollPage";
import SmeDocumentsPage from "./pages/sme/SmeDocumentsPage";
import KnowledgeBasePage from "./pages/help/KnowledgeBasePage";
import VideoTutorialsPage from "./pages/help/VideoTutorialsPage";
import KeyboardShortcutsPage from "./pages/help/KeyboardShortcutsPage";
import ContactUsPage from "./pages/help/ContactUsPage";
import UserProfilePage from "./pages/admin/UserProfilePage";
import CompaniesHouseTest from "./pages/CompaniesHouseTest";
import CalendarPage from "./pages/practice/CalendarPage";
import SchedulePage from "./pages/practice/SchedulePage";
import CapacityPage from "./pages/practice/CapacityPage";
import AmlCompliancePage from "./pages/aml/AmlCompliancePage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
// Module imports
import SalesInvoicesList from "./pages/bookkeeping/sales/SalesInvoicesList";
import SalesInvoiceCreator from "./pages/bookkeeping/sales/SalesInvoiceCreator";
import QuotationCreator from "./pages/bookkeeping/sales/QuotationCreator";
import PurchasesList from "./pages/bookkeeping/purchases/PurchasesList";
import PurchaseCreator from "./pages/bookkeeping/purchases/PurchaseCreator";
import BankAccountsList from "./pages/bookkeeping/bank/BankAccountsList";
import BankReconciliationPage from "./pages/bookkeeping/bank/BankReconciliationPage";
import BankRulesPage from "./pages/bookkeeping/bank/BankRulesPage";
import CashCodingPage from "./pages/bookkeeping/bank/CashCodingPage";
import TimeFeesHome from "./pages/time-fees/TimeFeesHome";
import JobsListPage from "./pages/time-fees/JobsListPage";
import TimesheetPage from "./pages/time-fees/TimesheetPage";
import FeeInvoicesPage from "./pages/time-fees/InvoicesPage";
import ExpensesPage from "./pages/time-fees/ExpensesPage";
import TimeFeesSettingsPage from "./pages/time-fees/TimeFeesSettingsPage";
import TimeFeesReportsPage from "./pages/time-fees/TimeFeesReportsPage";
import JournalsPage from "./pages/bookkeeping/JournalsPage";
import MyAdminUsersPage from "./pages/admin/MyAdminUsersPage";
import CompanyClientPage from "./pages/company-secretarial/CompanyClientPage";
import FormationWizard from "./pages/company-secretarial/FormationWizard";
import SupportTicketsPage from "./pages/admin/SupportTicketsPage";
import QuotationsList from "./pages/bookkeeping/sales/QuotationsList";
import ItemsPage from "./pages/bookkeeping/ItemsPage";
import ItemFormPage from "./pages/bookkeeping/ItemFormPage";
import InvoiceTemplateSettingsPage from "./pages/bookkeeping/InvoiceTemplateSettingsPage";
import VatSettingsPage from "./pages/bookkeeping/VatSettingsPage";
import CisSettingsPage from "./pages/bookkeeping/CisSettingsPage";
import BankFeedsPage from "./pages/bookkeeping/BankFeedsPage";
import BankTransferPage from "./pages/bookkeeping/BankTransferPage";
import ReceiptsPage from "./pages/bookkeeping/ReceiptsPage";
import PurchasePaymentsPage from "./pages/bookkeeping/PurchasePaymentsPage";
import RecurringInvoicesPage from "./pages/bookkeeping/RecurringInvoicesPage";
import RecurringPurchasesPage from "./pages/bookkeeping/RecurringPurchasesPage";
import SalesDashboardPage from "./pages/bookkeeping/SalesDashboardPage";
import PurchaseDashboardPage from "./pages/bookkeeping/PurchaseDashboardPage";
import FixedAssetsPage from "./pages/bookkeeping/FixedAssetsPage";
import InventoryPage from "./pages/bookkeeping/InventoryPage";
import VatReportPage from "./pages/bookkeeping/VatReportPage";
import MtdPortalPage from "./pages/bookkeeping/MtdPortalPage";
import QuickEntryPage from "./pages/bookkeeping/QuickEntryPage";
import BulkEditPage from "./pages/bookkeeping/BulkEditPage";
import BudgetingPage from "./pages/bookkeeping/BudgetingPage";
import DividendsPage from "./pages/bookkeeping/DividendsPage";
import MinutesOfMeetingsPage from "./pages/bookkeeping/MinutesOfMeetingsPage";
import NotesPage from "./pages/bookkeeping/NotesPage";
import LogsPage from "./pages/bookkeeping/LogsPage";
import CisSubcontractorPage from "./pages/bookkeeping/CisSubcontractorPage";
import Cis300Page from "./pages/bookkeeping/Cis300Page";
import { VatTransactionsPage, EcSalesListPage, CisReportsPage } from "./pages/bookkeeping/FinalReportsPages";
import DocScanPage from "./pages/bookkeeping/DocScanPage";
import SanSuitePayPage from "./pages/bookkeeping/SanSuitePayPage";

// ---------------------------------------------------------------------------
// STABLE PRIVATE ROUTE FACTORY
// Creates wrapper components ONCE at module level — never recreated on render.
// This is critical: inline `component={() => <PrivateRoute ... />}` in <Route>
// creates a new function reference every render, causing full page unmount/remount.
// ---------------------------------------------------------------------------
function makePrivate(Component: React.ComponentType<any>): React.ComponentType<any> {
  return function PrivateWrapper(props: any) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Redirect to="/login" />;
    return <Component {...props} />;
  };
}

function RootGateway() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.isPortalUser || user?.portalType === "sme") {
    return <Redirect to="/sme/dashboard" />;
  }
  if (user?.portalType === "365") {
    return <Redirect to="/portal/workspace" />;
  }
  return <EcosystemDashboard />;
}

// Practice Management
const R_EcosystemDashboard = makePrivate(EcosystemDashboard);
const R_PracticeManagement = makePrivate(PracticeManagement);
const R_TasksPage = makePrivate(TasksPage);
const R_CrmPage = makePrivate(CrmPage);
const R_PracticeClientsPage = makePrivate(PracticeClientsPage);
const R_CrmConnectionsPage = makePrivate(CrmConnectionsPage);
const R_CrmCommunicationsPage = makePrivate(CrmCommunicationsPage);
const R_ClientDetailsPage = makePrivate(ClientDetailsPage);
const R_ServicesPage = makePrivate(ServicesPage);
const R_DeadlinesPage = makePrivate(DeadlinesPage);
const R_ConversationsPage = makePrivate(ConversationsPage);
const R_CommunicationPage = makePrivate(CommunicationPage);
const R_ProposalsPage = makePrivate(ProposalsPage);
const R_DocumentRequestsPage = makePrivate(DocumentRequestsPage);
const R_PracticeReportsPage = makePrivate(PracticeReportsPage);
const R_PracticeSettingsPage = makePrivate(PracticeSettingsPage);
const R_PracticeTeamPage = makePrivate(PracticeTeamPage);
const R_CapacityPage = makePrivate(CapacityPage);
const R_TimesheetPage = makePrivate(TimesheetPage);
const R_PracticeeSignPage = makePrivate(PracticeeSignPage);
const R_SchedulePage = makePrivate(SchedulePage);
const R_CalendarPage = makePrivate(CalendarPage);
const R_ActivityPage = makePrivate(ActivityPage);
const R_AmlCompliancePage = makePrivate(AmlCompliancePage);
const R_OnboardingPage = makePrivate(OnboardingPage);

// Admin
const R_MyAdminPage = makePrivate(MyAdminPage);
const R_MyAdminUsersPage = makePrivate(MyAdminUsersPage);
const R_UserProfilePage = makePrivate(UserProfilePage);
const R_SupportTicketsPage = makePrivate(SupportTicketsPage);
const R_CompaniesHouseTest = makePrivate(CompaniesHouseTest);

// Bookkeeping
const R_BookkeepingHome = makePrivate(BookkeepingHome);
const R_InvoicesPage = makePrivate(InvoicesPage);
const R_PurchasesPage = makePrivate(PurchasesPage);
const R_BankPage = makePrivate(BankPage);
const R_VatPage = makePrivate(VatPage);
const R_ContactsPage = makePrivate(ContactsPage);
const R_ReportsPage = makePrivate(ReportsPage);
const R_ChartOfAccountsPage = makePrivate(ChartOfAccountsPage);
const R_BookkeepingSettingsPage = makePrivate(BookkeepingSettingsPage);
const R_CompanyInfoPage = makePrivate(CompanyInfoPage);
const R_AccountingPeriodsPage = makePrivate(AccountingPeriodsPage);
const R_ChartOfAccountsSettingsPage = makePrivate(ChartOfAccountsSettingsPage);
const R_CompanyLogoPage = makePrivate(CompanyLogoPage);
const R_OpeningBalancePage = makePrivate(OpeningBalancePage);
const R_CurrencyPage = makePrivate(CurrencyPage);
const R_CustomiseSequencePage = makePrivate(CustomiseSequencePage);
const R_InvoiceTemplateSettings = makePrivate(InvoiceTemplateSettingsPage);
const R_QuotationsList = makePrivate(QuotationsList);
const R_QuotationCreator = makePrivate(QuotationCreator);
const R_ReceiptsPage = makePrivate(ReceiptsPage);
const R_ItemsPage = makePrivate(ItemsPage);
const R_ItemFormPage = makePrivate(ItemFormPage);
const R_PurchasePaymentsPage = makePrivate(PurchasePaymentsPage);
const R_BankTransferPage = makePrivate(BankTransferPage);
const R_VatSettingsPage = makePrivate(VatSettingsPage);
const R_SalesDashboardPage = makePrivate(SalesDashboardPage);
const R_SanSuitePayPage = makePrivate(SanSuitePayPage);
const R_RecurringInvoicesPage = makePrivate(RecurringInvoicesPage);
const R_PurchaseDashboardPage = makePrivate(PurchaseDashboardPage);
const R_DocScanPage = makePrivate(DocScanPage);
const R_RecurringPurchasesPage = makePrivate(RecurringPurchasesPage);
const R_QuickEntryPage = makePrivate(QuickEntryPage);
const R_FixedAssetsPage = makePrivate(FixedAssetsPage);
const R_InventoryPage = makePrivate(InventoryPage);
const R_BudgetingPage = makePrivate(BudgetingPage);
const R_DividendsPage = makePrivate(DividendsPage);
const R_BulkEditPage = makePrivate(BulkEditPage);
const R_BankFeedsPage = makePrivate(BankFeedsPage);
const R_MinutesPage = makePrivate(MinutesOfMeetingsPage);
const R_NotesPage = makePrivate(NotesPage);
const R_VatReportPage = makePrivate(VatReportPage);
const R_VatTransactionsPage = makePrivate(VatTransactionsPage);
const R_EcSalesListPage = makePrivate(EcSalesListPage);
const R_MtdPortalPage = makePrivate(MtdPortalPage);
const R_CisSubcontractorPage = makePrivate(CisSubcontractorPage);
const R_Cis300Page = makePrivate(Cis300Page);
const R_CisReportsPage = makePrivate(CisReportsPage);
const R_CisSettingsPage = makePrivate(CisSettingsPage);
const R_LogsPage = makePrivate(LogsPage);
const R_ClientProfilePage = makePrivate(ClientProfilePage);
const R_SalesInvoicesList = makePrivate(SalesInvoicesList);
const R_SalesInvoiceCreator = makePrivate(SalesInvoiceCreator);
const R_PurchasesList = makePrivate(PurchasesList);
const R_PurchaseCreator = makePrivate(PurchaseCreator);
const R_BankAccountsList = makePrivate(BankAccountsList);
const R_BankReconciliationPage = makePrivate(BankReconciliationPage);
const R_BankRulesPage = makePrivate(BankRulesPage);
const R_CashCodingPage = makePrivate(CashCodingPage);
const R_JournalsPage = makePrivate(JournalsPage);
const R_VatPageClient = makePrivate(VatPage);

// Payroll
const R_PayrollHome = makePrivate(PayrollHome);
const R_EmployeesPage = makePrivate(EmployeesPage);
const R_PayRunsPage = makePrivate(PayRunsPage);
const R_PayrollRtiPage = makePrivate(PayrollRtiPage);
const R_PayrollSettingsPage = makePrivate(PayrollSettingsPage);
const R_ClientPayrollDashboard = makePrivate(ClientPayrollDashboard);
const R_DepartmentsPage = makePrivate(DepartmentsPage);
const R_AdditionalPayPage = makePrivate(AdditionalPayPage);
const R_TimekeepingPage = makePrivate(TimekeepingPage);
const R_AutoEnrolmentPage = makePrivate(AutoEnrolmentPage);
const R_PayrollSubmissionsPage = makePrivate(PayrollSubmissionsPage);
const R_P11dFormsPage = makePrivate(P11dFormsPage);
const R_PayrollReportsPage = makePrivate(PayrollReportsPage);
const R_BulkPayrollPage = makePrivate(BulkPayrollPage);

// Accounts Production
const R_AccountsProductionHome = makePrivate(AccountsProductionHome);
const R_TrialBalancePage = makePrivate(TrialBalancePage);
const R_ReportSettingsPage = makePrivate(ReportSettingsPage);
const R_AccountsSubmissionPage = makePrivate(AccountsSubmissionPage);
const R_ClientWorkspacePage = makePrivate(ClientWorkspacePage);
const R_WorkspaceDashboardPage = makePrivate(WorkspaceDashboardPage);
const R_StatementsPage = makePrivate(StatementsPage);
const R_StatutoryNotesPage = makePrivate(StatutoryNotesPage);
const R_AccountingPoliciesPage = makePrivate(AccountingPoliciesPage);
const R_ChartOfAccountsWorkspacePage = makePrivate(ChartOfAccountsWorkspacePage);
const R_TrialBalanceWorkspacePage = makePrivate(TrialBalanceWorkspacePage);
const R_IxbrlFilingPage = makePrivate(IxbrlFilingPage);
const R_eSignWorkspacePage = makePrivate(eSignWorkspacePage);
const R_ReportsPackPage = makePrivate(ReportsPackPage);
const R_TasksWorkspacePage = makePrivate(TasksWorkspacePage);
const R_ChApiWorkspacePage = makePrivate(ChApiWorkspacePage);
const R_DirectorsWorkspacePage = makePrivate(DirectorsWorkspacePage);
const R_AuditLogsWorkspacePage = makePrivate(AuditLogsWorkspacePage);

// Corporation Tax
const R_CorporationTaxHome = makePrivate(CorporationTaxHome);
const R_CT600Form = makePrivate(CT600Form);
const R_CTClientWorkspacePage = makePrivate(CTClientWorkspacePage);
const R_CTDashboardPage = makePrivate(CTDashboardPage);
const R_CTComputationPage = makePrivate(CTComputationPage);
const R_CTCalculatorsPage = makePrivate(CTCalculatorsPage);
const R_CTSupplementaryPage = makePrivate(CTSupplementaryPage);
const R_CTAttachmentsPage = makePrivate(CTAttachmentsPage);
const R_CTTaxDuePage = makePrivate(CTTaxDuePage);
const R_CTeSignPage = makePrivate(CTeSignPage);
const R_CTSubmitPage = makePrivate(CTSubmitPage);

// Self Assessment
const R_SelfAssessmentHome = makePrivate(SelfAssessmentHome);
const R_SA100Form = makePrivate(SA100Form);
const R_SA800Form = makePrivate(SA800Form);
const R_ClientQuestionnaire = makePrivate(ClientQuestionnaire);
const R_SAClientWorkspacePage = makePrivate(SAClientWorkspacePage);
const R_SADashboardPage = makePrivate(SADashboardPage);
const R_SAFormsPage = makePrivate(SAFormsPage);
const R_SASchedulesPage = makePrivate(SASchedulesPage);
const R_SACalculatorsPage = makePrivate(SACalculatorsPage);
const R_SACalculationPage = makePrivate(SACalculationPage);
const R_SAPoaPage = makePrivate(SAPoaPage);
const R_SATaxDuePage = makePrivate(SATaxDuePage);
const R_SAQuestionnairePage = makePrivate(SAQuestionnairePage);
const R_SAeSignPage = makePrivate(SAeSignPage);
const R_SASubmitPage = makePrivate(SASubmitPage);
const R_SelfAssessmentSettingsPage = makePrivate(SelfAssessmentSettingsPage);

// Other modules
const R_CharityAccountsHome = makePrivate(CharityAccountsHome);
const R_CharityDashboardPage = makePrivate(CharityDashboardPage);
const R_CharityFundsPage = makePrivate(CharityFundsPage);
const R_CharityDonationsPage = makePrivate(CharityDonationsPage);
const R_CharityAccountsProductionPage = makePrivate(CharityAccountsProductionPage);
const R_CharityBookkeepingPage = makePrivate(CharityBookkeepingPage);
const R_CharityManagePage = makePrivate(CharityManagePage);
const R_MtdItHome = makePrivate(MtdItHome);
const R_CompanySecretarialHome = makePrivate(CompanySecretarialHome);
const R_FormationWizard = makePrivate(FormationWizard);
const R_CompanyClientPage = makePrivate(CompanyClientPage);
const R_Portal365Home = makePrivate(Portal365Home);
const R_ClientPortalDashboard = makePrivate(ClientPortalDashboard);
const R_Client365WorkspacePage = makePrivate(Client365WorkspacePage);
const R_SmeDashboardPage = makePrivate(SmeDashboardPage);
const R_SmeInvoicesPage = makePrivate(SmeInvoicesPage);
const R_SmePurchasesPage = makePrivate(SmePurchasesPage);
const R_SmeBankPage = makePrivate(SmeBankPage);
const R_SmePayrollPage = makePrivate(SmePayrollPage);
const R_SmeDocumentsPage = makePrivate(SmeDocumentsPage);
const R_eSignHome = makePrivate(EsignHome);

// Time & Fees
const R_TimeFeesHome = makePrivate(TimeFeesHome);
const R_JobsListPage = makePrivate(JobsListPage);
const R_FeeInvoicesPage = makePrivate(FeeInvoicesPage);
const R_ExpensesPage = makePrivate(ExpensesPage);
const R_TimeFeesReportsPage = makePrivate(TimeFeesReportsPage);
const R_TimeFeesSettingsPage = makePrivate(TimeFeesSettingsPage);

// Help
const R_KnowledgeBasePage = makePrivate(KnowledgeBasePage);
const R_VideoTutorialsPage = makePrivate(VideoTutorialsPage);
const R_KeyboardShortcutsPage = makePrivate(KeyboardShortcutsPage);
const R_ContactUsPage = makePrivate(ContactUsPage);

// ---------------------------------------------------------------------------

function AppRoutes() {
  const { token, updateUser } = useAuth();

  // Keep authenticated user profile synced with MySQL database
  useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) return null;
        const freshUser = await res.json();
        if (freshUser && freshUser.id) {
          updateUser(freshUser);
        }
        return freshUser;
      } catch {
        return null;
      }
    },
    enabled: !!token,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  // Maintenance check — separate key, polls every 60s, handles 503 from server
  const { data: isMaintenance } = useQuery<boolean>({
    queryKey: ["maintenance-check"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.status === 503) {
          const body = await res.json().catch(() => ({}));
          if (body?.isMaintenanceMode) return true;
        }
      } catch { }
      return false;
    },
    refetchInterval: 60000,
    staleTime: 60000,
  });

  if (isMaintenance) {
    return <MaintenanceModePage />;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/login/accountant" component={LoginPage} />
      <Route path="/login/sme" component={LoginPage} />
      <Route path="/login/365" component={LoginPage} />
      <Route path="/account/login" component={LoginPage} />
      <Route path="/Account/Login" component={LoginPage} />
      <Route path="/sign-in" component={LoginPage} />
      <Route path="/" component={RootGateway} />
      <Route path="/hmrc/callback" component={HmrcCallbackPage} />
      <Route path="/practice" component={R_PracticeManagement} />
      <Route path="/practice/tasks" component={R_TasksPage} />
      <Route path="/practice/crm" component={R_CrmPage} />
      <Route path="/practice/crm/dashboard" component={R_CrmPage} />
      <Route path="/practice/crm/connections" component={R_CrmConnectionsPage} />
      <Route path="/practice/crm/communications" component={R_CrmCommunicationsPage} />
      <Route path="/practice/clients" component={R_PracticeClientsPage} />
      <Route path="/practice/clients/:id" component={R_ClientDetailsPage} />
      <Route path="/practice/services" component={R_ServicesPage} />
      <Route path="/practice/deadlines" component={R_DeadlinesPage} />
      <Route path="/practice/communication" component={R_CommunicationPage} />
      <Route path="/practice/conversations" component={R_ConversationsPage} />
      <Route path="/practice/proposals" component={R_ProposalsPage} />
      <Route path="/practice/documents" component={R_DocumentRequestsPage} />
      <Route path="/public/sign/:token" component={PublicSigningPage} />
      <Route path="/practice/reports" component={R_PracticeReportsPage} />
      <Route path="/practice/settings" component={R_PracticeSettingsPage} />
      <Route path="/practice/team" component={R_PracticeTeamPage} />
      <Route path="/practice/staff" component={R_PracticeTeamPage} />
      <Route path="/practice/capacity" component={R_CapacityPage} />
      <Route path="/practice/time-fees" component={R_TimesheetPage} />
      <Route path="/practice/esign" component={R_PracticeeSignPage} />
      <Route path="/practice/schedule" component={R_SchedulePage} />
      <Route path="/practice/calendar" component={R_CalendarPage} />
      <Route path="/practice/activity" component={R_ActivityPage} />
      <Route path="/admin" component={R_MyAdminPage} />
      <Route path="/admin/users" component={R_MyAdminUsersPage} />
      <Route path="/my-admin/users" component={R_MyAdminUsersPage} />
      <Route path="/admin/roles-permissions" component={R_MyAdminUsersPage} />
      <Route path="/admin/permissions" component={R_MyAdminUsersPage} />
      <Route path="/practice/roles-permissions" component={R_MyAdminUsersPage} />
      <Route path="/profile" component={R_UserProfilePage} />
      <Route path="/support" component={R_SupportTicketsPage} />
      <Route path="/ch-test" component={R_CompaniesHouseTest} />

      <Route path="/bookkeeping" component={R_BookkeepingHome} />
      <Route path="/bookkeeping/invoices" component={R_InvoicesPage} />
      <Route path="/bookkeeping/purchases" component={R_PurchasesPage} />
      <Route path="/bookkeeping/bank" component={R_BankPage} />
      <Route path="/bookkeeping/vat" component={R_VatPage} />
      <Route path="/bookkeeping/contacts" component={R_ContactsPage} />
      <Route path="/bookkeeping/reports" component={R_ReportsPage} />
      <Route path="/bookkeeping/coa" component={R_ChartOfAccountsPage} />
      <Route path="/bookkeeping/settings" component={R_CompanyInfoPage} />
      <Route path="/bookkeeping/company-info" component={R_CompanyInfoPage} />
      <Route path="/bookkeeping/accounting-periods" component={R_AccountingPeriodsPage} />
      <Route path="/bookkeeping/chart-of-accounts" component={R_ChartOfAccountsSettingsPage} />
      <Route path="/bookkeeping/company-logo" component={R_CompanyLogoPage} />
      <Route path="/bookkeeping/template-settings" component={R_InvoiceTemplateSettings} />
      <Route path="/bookkeeping/opening-balance" component={R_OpeningBalancePage} />
      <Route path="/bookkeeping/currency" component={R_CurrencyPage} />
      <Route path="/bookkeeping/customise-sequence" component={R_CustomiseSequencePage} />
      <Route path="/bookkeeping/quotes" component={R_QuotationsList} />
      <Route path="/bookkeeping/quotes/new" component={R_QuotationCreator} />
      <Route path="/bookkeeping/quotes/:quoteId/edit" component={R_QuotationCreator} />
      <Route path="/bookkeeping/receipts" component={R_ReceiptsPage} />
      <Route path="/bookkeeping/items" component={R_ItemsPage} />
      <Route path="/bookkeeping/items/new" component={R_ItemFormPage} />
      <Route path="/bookkeeping/items/:itemId/edit" component={R_ItemFormPage} />
      <Route path="/bookkeeping/purchase-payments" component={R_PurchasePaymentsPage} />
      <Route path="/bookkeeping/bank-transfer" component={R_BankTransferPage} />
      <Route path="/bookkeeping/vat-settings" component={R_VatSettingsPage} />

      {/* NEW PLACEHOLDER ROUTES */}
      <Route path="/bookkeeping/sales" component={R_SalesDashboardPage} />
      <Route path="/bookkeeping/SanSuite-pay" component={R_SanSuitePayPage} />
      <Route path="/bookkeeping/recurring-invoices" component={R_RecurringInvoicesPage} />
      <Route path="/bookkeeping/purchase-dashboard" component={R_PurchaseDashboardPage} />
      <Route path="/bookkeeping/docscan" component={R_DocScanPage} />
      <Route path="/bookkeeping/recurring-purchases" component={R_RecurringPurchasesPage} />
      <Route path="/bookkeeping/quick-entry" component={R_QuickEntryPage} />
      <Route path="/bookkeeping/fixed-assets" component={R_FixedAssetsPage} />
      <Route path="/bookkeeping/inventory" component={R_InventoryPage} />
      <Route path="/bookkeeping/budgeting" component={R_BudgetingPage} />
      <Route path="/bookkeeping/dividends" component={R_DividendsPage} />
      <Route path="/bookkeeping/bulk-edit" component={R_BulkEditPage} />
      <Route path="/bookkeeping/bank-feeds" component={R_BankFeedsPage} />
      <Route path="/bookkeeping/minutes" component={R_MinutesPage} />
      <Route path="/bookkeeping/notes" component={R_NotesPage} />
      <Route path="/bookkeeping/vat-report" component={R_VatReportPage} />
      <Route path="/bookkeeping/vat-transactions" component={R_VatTransactionsPage} />
      <Route path="/bookkeeping/ec-sales" component={R_EcSalesListPage} />
      <Route path="/bookkeeping/mtd" component={R_MtdPortalPage} />
      <Route path="/bookkeeping/cis-subcontractor" component={R_CisSubcontractorPage} />
      <Route path="/bookkeeping/cis-300" component={R_Cis300Page} />
      <Route path="/bookkeeping/cis-reports" component={R_CisReportsPage} />
      <Route path="/bookkeeping/cis-settings" component={R_CisSettingsPage} />
      <Route path="/bookkeeping/logs" component={R_LogsPage} />
      <Route path="/bookkeeping/:id" component={R_ClientProfilePage} />
      <Route path="/bookkeeping/:id/invoices" component={R_SalesInvoicesList} />
      <Route path="/bookkeeping/:id/invoices/new" component={R_SalesInvoiceCreator} />
      <Route path="/bookkeeping/:id/invoices/:invoiceId/edit" component={R_SalesInvoiceCreator} />
      <Route path="/bookkeeping/:id/purchases" component={R_PurchasesList} />
      <Route path="/bookkeeping/:id/purchases/new" component={R_PurchaseCreator} />
      <Route path="/bookkeeping/:id/bank" component={R_BankAccountsList} />
      <Route path="/bookkeeping/:id/bank/:accountId/reconcile" component={R_BankReconciliationPage} />
      <Route path="/bookkeeping/:id/bank-rules" component={R_BankRulesPage} />
      <Route path="/bookkeeping/:id/cash-coding" component={R_CashCodingPage} />
      <Route path="/bookkeeping/:id/journals" component={R_JournalsPage} />
      <Route path="/bookkeeping/:id/vat" component={R_VatPageClient} />
      <Route path="/bookkeeping/:id/settings" component={R_CompanyInfoPage} />
      <Route path="/bookkeeping/:id/company-info" component={R_CompanyInfoPage} />
      <Route path="/bookkeeping/:id/accounting-periods" component={R_AccountingPeriodsPage} />
      <Route path="/bookkeeping/:id/chart-of-accounts" component={R_ChartOfAccountsSettingsPage} />
      <Route path="/bookkeeping/:id/company-logo" component={R_CompanyLogoPage} />
      <Route path="/bookkeeping/:id/opening-balance" component={R_OpeningBalancePage} />
      <Route path="/bookkeeping/:id/currency" component={R_CurrencyPage} />
      <Route path="/bookkeeping/:id/customise-sequence" component={R_CustomiseSequencePage} />
      <Route path="/bookkeeping/:id/contacts" component={R_ContactsPage} />
      <Route path="/bookkeeping/:id/reports" component={R_ReportsPage} />

      {/* NEW CLIENT-SPECIFIC PLACEHOLDER ROUTES */}
      <Route path="/bookkeeping/:id/sales" component={R_SalesDashboardPage} />
      <Route path="/bookkeeping/:id/quotes" component={R_QuotationsList} />
      <Route path="/bookkeeping/:id/quotes/new" component={R_QuotationCreator} />
      <Route path="/bookkeeping/:id/quotes/:quoteId/edit" component={R_QuotationCreator} />
      <Route path="/bookkeeping/:id/receipts" component={R_ReceiptsPage} />

      <Route path="/bookkeeping/:id/items" component={R_ItemsPage} />
      <Route path="/bookkeeping/:id/items/new" component={R_ItemFormPage} />
      <Route path="/bookkeeping/:id/items/:itemId/edit" component={R_ItemFormPage} />
      <Route path="/bookkeeping/:id/template-settings" component={R_InvoiceTemplateSettings} />
      <Route path="/bookkeeping/:id/purchase-payments" component={R_PurchasePaymentsPage} />
      <Route path="/bookkeeping/:id/bank-transfer" component={R_BankTransferPage} />
      <Route path="/bookkeeping/:id/SanSuite-pay" component={R_SanSuitePayPage} />
      <Route path="/bookkeeping/:id/recurring-invoices" component={R_RecurringInvoicesPage} />
      <Route path="/bookkeeping/:id/purchase-dashboard" component={R_PurchaseDashboardPage} />
      <Route path="/bookkeeping/:id/docscan" component={R_DocScanPage} />
      <Route path="/bookkeeping/:id/recurring-purchases" component={R_RecurringPurchasesPage} />
      <Route path="/bookkeeping/:id/quick-entry" component={R_QuickEntryPage} />
      <Route path="/bookkeeping/:id/fixed-assets" component={R_FixedAssetsPage} />
      <Route path="/bookkeeping/:id/inventory" component={R_InventoryPage} />
      <Route path="/bookkeeping/:id/vat-report" component={R_VatReportPage} />
      <Route path="/bookkeeping/:id/vat-settings" component={R_VatSettingsPage} />
      <Route path="/bookkeeping/:id/mtd" component={R_MtdPortalPage} />
      <Route path="/bookkeeping/:id/mtd-portal" component={R_MtdPortalPage} />
      <Route path="/bookkeeping/:id/cis-subcontractors" component={R_CisSubcontractorPage} />
      <Route path="/bookkeeping/:id/cis-subcontractor" component={R_CisSubcontractorPage} />
      <Route path="/bookkeeping/:id/cis-300" component={R_Cis300Page} />

      <Route path="/bookkeeping/:id/budgeting" component={R_BudgetingPage} />
      <Route path="/bookkeeping/:id/dividends" component={R_DividendsPage} />
      <Route path="/bookkeeping/:id/bulk-edit" component={R_BulkEditPage} />
      <Route path="/bookkeeping/:id/bank-feeds" component={R_BankFeedsPage} />
      <Route path="/bookkeeping/:id/minutes" component={R_MinutesPage} />
      <Route path="/bookkeeping/:id/notes" component={R_NotesPage} />
      <Route path="/bookkeeping/:id/vat-transactions" component={R_VatTransactionsPage} />
      <Route path="/bookkeeping/:id/ec-sales" component={R_EcSalesListPage} />
      <Route path="/bookkeeping/:id/cis-reports" component={R_CisReportsPage} />
      <Route path="/bookkeeping/:id/cis-settings" component={R_CisSettingsPage} />
      <Route path="/bookkeeping/:id/logs" component={R_LogsPage} />

      {/* Practice Level Payroll */}
      <Route path="/payroll" component={R_PayrollHome} />
      <Route path="/payroll/bulk" component={R_BulkPayrollPage} />
      <Route path="/payroll/employees" component={R_EmployeesPage} />
      <Route path="/payroll/payruns" component={R_PayRunsPage} />
      <Route path="/payroll/pay-runs" component={R_PayRunsPage} />
      <Route path="/payroll/rti" component={R_PayrollRtiPage} />
      <Route path="/payroll/settings" component={R_PayrollSettingsPage} />

      {/* Client Specific Payroll Workspace */}
      <Route path="/payroll/:clientId/dashboard" component={R_ClientPayrollDashboard} />
      <Route path="/payroll/:clientId/employees" component={R_EmployeesPage} />
      <Route path="/payroll/:clientId/departments" component={R_DepartmentsPage} />
      <Route path="/payroll/:clientId/additional" component={R_AdditionalPayPage} />
      <Route path="/payroll/:clientId/timekeeping" component={R_TimekeepingPage} />
      <Route path="/payroll/:clientId/payruns" component={R_PayRunsPage} />
      <Route path="/payroll/:clientId/process" component={R_PayRunsPage} />
      <Route path="/payroll/:clientId/auto-enrolment" component={R_AutoEnrolmentPage} />
      <Route path="/payroll/:clientId/submissions" component={R_PayrollSubmissionsPage} />
      <Route path="/payroll/:clientId/p11d" component={R_P11dFormsPage} />
      <Route path="/payroll/:clientId/reports" component={R_PayrollReportsPage} />
      <Route path="/payroll/:clientId/settings" component={R_PayrollSettingsPage} />
      <Route path="/payroll/:clientId" component={R_ClientPayrollDashboard} />
      <Route path="/accounts-production" component={R_AccountsProductionHome} />
      <Route path="/accounts-production/:clientId/dashboard" component={R_WorkspaceDashboardPage} />
      <Route path="/accounts-production/:clientId/statements" component={R_StatementsPage} />
      <Route path="/accounts-production/:clientId/statutory-notes" component={R_StatutoryNotesPage} />
      <Route path="/accounts-production/:clientId/accounting-policies" component={R_AccountingPoliciesPage} />
      <Route path="/accounts-production/:clientId/chart-of-accounts" component={R_ChartOfAccountsWorkspacePage} />
      <Route path="/accounts-production/:clientId/settings/chart-of-accounts" component={R_ChartOfAccountsWorkspacePage} />
      <Route path="/accounts-production/:clientId/trial-balance" component={R_TrialBalanceWorkspacePage} />
      <Route path="/accounts-production/:clientId/tb" component={R_TrialBalancePage} />
      <Route path="/accounts-production/:clientId/ixbrl-filing" component={R_IxbrlFilingPage} />
      <Route path="/accounts-production/:clientId/submit" component={R_AccountsSubmissionPage} />
      <Route path="/accounts-production/:clientId/esign" component={R_eSignWorkspacePage} />
      <Route path="/accounts-production/:clientId/reports" component={R_ReportsPackPage} />
      <Route path="/accounts-production/:clientId/settings" component={R_ReportSettingsPage} />
      <Route path="/accounts-production/:clientId/tasks" component={R_TasksWorkspacePage} />
      <Route path="/accounts-production/:clientId/ch-api" component={R_ChApiWorkspacePage} />
      <Route path="/accounts-production/:clientId/directors" component={R_DirectorsWorkspacePage} />
      <Route path="/accounts-production/:clientId/logs" component={R_AuditLogsWorkspacePage} />
      <Route path="/accounts-production/:clientId" component={R_ClientWorkspacePage} />
      <Route path="/corporation-tax" component={R_CorporationTaxHome} />
      <Route path="/corporation-tax/returns" component={R_CorporationTaxHome} />
      <Route path="/corporation-tax/:clientId/dashboard" component={R_CTDashboardPage} />
      <Route path="/corporation-tax/:clientId/computation" component={R_CTComputationPage} />
      <Route path="/corporation-tax/:clientId/calculators" component={R_CTCalculatorsPage} />
      <Route path="/corporation-tax/:clientId/supplementary" component={R_CTSupplementaryPage} />
      <Route path="/corporation-tax/:clientId/attachments" component={R_CTAttachmentsPage} />
      <Route path="/corporation-tax/:clientId/tax-due" component={R_CTTaxDuePage} />
      <Route path="/corporation-tax/:clientId/esign" component={R_CTeSignPage} />
      <Route path="/corporation-tax/:clientId/submit" component={R_CTSubmitPage} />
      <Route path="/corporation-tax/:clientId" component={R_CTClientWorkspacePage} />
      <Route path="/self-assessment" component={R_SelfAssessmentHome} />
      <Route path="/self-assessment/sa100" component={R_SA100Form} />
      <Route path="/self-assessment/sa800" component={R_SA800Form} />
      <Route path="/self-assessment/questionnaire" component={R_ClientQuestionnaire} />
      <Route path="/self-assessment/settings" component={R_SelfAssessmentSettingsPage} />
      <Route path="/self-assessment/:clientId/dashboard" component={R_SADashboardPage} />
      <Route path="/self-assessment/:clientId/forms" component={R_SAFormsPage} />
      <Route path="/self-assessment/:clientId/schedules" component={R_SASchedulesPage} />
      <Route path="/self-assessment/:clientId/calculators" component={R_SACalculatorsPage} />
      <Route path="/self-assessment/:clientId/calculation" component={R_SACalculationPage} />
      <Route path="/self-assessment/:clientId/poa" component={R_SAPoaPage} />
      <Route path="/self-assessment/:clientId/tax-due" component={R_SATaxDuePage} />
      <Route path="/self-assessment/:clientId/questionnaire" component={R_SAQuestionnairePage} />
      <Route path="/self-assessment/:clientId/esign" component={R_SAeSignPage} />
      <Route path="/self-assessment/:clientId/submit" component={R_SASubmitPage} />
      <Route path="/self-assessment/:clientId" component={R_SAClientWorkspacePage} />
      <Route path="/charity-accounts" component={R_CharityAccountsHome} />
      <Route path="/charity-accounts/:charityId/dashboard" component={R_CharityDashboardPage} />
      <Route path="/charity-accounts/:charityId/funds" component={R_CharityFundsPage} />
      <Route path="/charity-accounts/:charityId/bookkeeping" component={R_CharityBookkeepingPage} />
      <Route path="/charity-accounts/:charityId/donations" component={R_CharityDonationsPage} />
      <Route path="/charity-accounts/:charityId/accounts-production" component={R_CharityAccountsProductionPage} />
      <Route path="/charity-accounts/:charityId/manage" component={R_CharityManagePage} />
      <Route path="/charity-accounts/:charityId" component={R_CharityDashboardPage} />
      <Route path="/mtd-it" component={R_MtdItHome} />
      <Route path="/company-secretarial" component={R_CompanySecretarialHome} />
      <Route path="/company-secretarial/formations/new" component={R_FormationWizard} />
      <Route path="/company-secretarial/:id" component={R_CompanyClientPage} />
      <Route path="/365" component={R_Portal365Home} />
      <Route path="/365/dashboard" component={R_Portal365Home} />
      <Route path="/365/clients" component={R_Portal365Home} />
      <Route path="/365/users" component={R_Portal365Home} />
      <Route path="/365/imports" component={R_Portal365Home} />
      <Route path="/365/permissions" component={R_Portal365Home} />
      <Route path="/365/permission" component={R_Portal365Home} />
      <Route path="/365/manage/clients" component={R_Portal365Home} />
      <Route path="/365/manage/users" component={R_Portal365Home} />
      <Route path="/365/manage/imports" component={R_Portal365Home} />
      <Route path="/365/manage/permission" component={R_Portal365Home} />
      <Route path="/365/manage/permissions" component={R_Portal365Home} />
      <Route path="/portal/client/:clientId" component={R_ClientPortalDashboard} />
      <Route path="/portal/accept/:token" component={AcceptInvitePage} />
      <Route path="/portal/accept-invite" component={AcceptInvitePage} />

      {/* Capium 365 Client Workspace */}
      <Route path="/portal/workspace" component={R_Client365WorkspacePage} />
      <Route path="/365/workspace" component={R_Client365WorkspacePage} />

      {/* Client & SME Portal Routes */}
      <Route path="/sme/dashboard" component={R_SmeDashboardPage} />
      <Route path="/sme/invoices" component={R_SmeInvoicesPage} />
      <Route path="/sme/purchases" component={R_SmePurchasesPage} />
      <Route path="/sme/bank" component={R_SmeBankPage} />
      <Route path="/sme/payroll" component={R_SmePayrollPage} />
      <Route path="/sme/documents" component={R_SmeDocumentsPage} />
      <Route path="/sme" component={R_SmeDashboardPage} />
      <Route path="/esign" component={R_eSignHome} />
      <Route path="/esign/public/:token" component={PublicSignPage} />
      <Route path="/aml" component={R_AmlCompliancePage} />
      <Route path="/practice/aml" component={R_AmlCompliancePage} />
      <Route path="/onboarding" component={R_OnboardingPage} />
      <Route path="/practice/onboarding" component={R_OnboardingPage} />

      {/* Help Center Routes */}
      <Route path="/help/knowledge-base" component={R_KnowledgeBasePage} />
      <Route path="/help/video-tutorials" component={R_VideoTutorialsPage} />
      <Route path="/help/keyboard-shortcuts" component={R_KeyboardShortcutsPage} />
      <Route path="/help/contact-us" component={R_ContactUsPage} />

      {/* Time and Fees, Practice Invoices & Timesheets */}
      <Route path="/time-fees" component={R_TimeFeesHome} />
      <Route path="/time-fees/jobs" component={R_JobsListPage} />
      <Route path="/time-fees/timesheets" component={R_TimesheetPage} />
      <Route path="/practice/practice-timesheet" component={R_TimesheetPage} />
      <Route path="/practice/record-time" component={R_TimesheetPage} />
      <Route path="/practice/timesheets" component={R_TimesheetPage} />
      <Route path="/time-fees/invoices" component={R_FeeInvoicesPage} />
      <Route path="/practice/invoices" component={R_FeeInvoicesPage} />
      <Route path="/invoices" component={R_FeeInvoicesPage} />
      <Route path="/time-fees/expenses" component={R_ExpensesPage} />
      <Route path="/time-fees/reports" component={R_TimeFeesReportsPage} />
      <Route path="/time-fees/settings" component={R_TimeFeesSettingsPage} />

      <Route>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">404 — Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <AppRoutes />
        <Toaster />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
