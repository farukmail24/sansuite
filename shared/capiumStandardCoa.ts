export interface CapiumNominalAccount {
  nominal_code: string;
  name: string;
  category: string;
  group_name: string;
  nature: string;
  statement: string;
  status: string;
}

export const CAPIUM_STANDARD_COA: CapiumNominalAccount[] = [
  {
    "nominal_code": "1000",
    "name": "Sales",
    "category": "Turnover",
    "group_name": "Turnover",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1010",
    "name": "Fee Income",
    "category": "Turnover",
    "group_name": "Turnover",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1020",
    "name": "Domestic Sales",
    "category": "Turnover",
    "group_name": "Turnover",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1030",
    "name": "Export Sales",
    "category": "Turnover",
    "group_name": "Turnover",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1050",
    "name": "Bank Interest",
    "category": "Turnover",
    "group_name": "Turnover",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "10600",
    "name": "Other Income",
    "category": "Turnover",
    "group_name": "Turnover",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1122",
    "name": "Opening Stock",
    "category": "Opening Stock",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1200",
    "name": "Opening Stock - Raw Materials",
    "category": "Opening Stock",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1201",
    "name": "Opening WIP",
    "category": "Opening Stock",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1202",
    "name": "Opening Stock - Finished Goods",
    "category": "Opening Stock",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1203",
    "name": "Opening Stock - Other Resale",
    "category": "Opening Stock",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1210",
    "name": "Purchases",
    "category": "Purchases",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "12130",
    "name": "Domestic Purchase",
    "category": "Purchases",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "12140",
    "name": "Import Purchase",
    "category": "Purchases",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1220",
    "name": "Closing Stock - Raw Materials",
    "category": "Closing Stock",
    "group_name": "Cost of Sales",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1221",
    "name": "Closing WIP",
    "category": "Closing Stock",
    "group_name": "Cost of Sales",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1222",
    "name": "Closing Stock - Finished Goods",
    "category": "Closing Stock",
    "group_name": "Cost of Sales",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1223",
    "name": "Closing Stock - Other Resale",
    "category": "Closing Stock",
    "group_name": "Cost of Sales",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "6667",
    "name": "Closing Stock",
    "category": "Closing Stock",
    "group_name": "Cost of Sales",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1230",
    "name": "Direct Wages & Salaries",
    "category": "Staff Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1231",
    "name": "Employer's PAYE & NI Contributions",
    "category": "Staff Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1232",
    "name": "Pension Contributions",
    "category": "Staff Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1233",
    "name": "Commissions Payable",
    "category": "Staff Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "12330",
    "name": "Staff Costs (Disallowable)",
    "category": "Staff Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1240",
    "name": "Depreciation Charge: Freehold Properties",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1241",
    "name": "Depreciation Charge: Leasehold Properties",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1242",
    "name": "Depreciation Charge: Plant & Machinery",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1243",
    "name": "Depreciation Charge: Motor Vehicles",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1244",
    "name": "Depreciation Charge: Fixtures & Fittings",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1245",
    "name": "Depreciation Charge: Computer Equipment",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1246",
    "name": "Depreciation Charge: Land & Buildings",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8508",
    "name": "Depreciation Charge: Improvements to property",
    "category": "Depreciation Charges",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1250",
    "name": "Profit/Loss on Sale (Tangible Fixed Assets)",
    "category": "Profit/Loss on Sale of Fixed Assets",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1260",
    "name": "Impairment Losses (Tangible Fixed Assets)",
    "category": "Impairment Losses",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1270",
    "name": "Sub-Contract Cost",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1271",
    "name": "Motor Vehicles Hire",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1272",
    "name": "Plant Hire",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1273",
    "name": "Rent",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1274",
    "name": "Other Direct Costs",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "12790",
    "name": "Customs Duty",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "12930",
    "name": "CIS Payment to Sub-contractors (Disallowable)",
    "category": "Other Direct Costs",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1275",
    "name": "Operating Lease Charges - Plant & Equipment",
    "category": "Operating Leases",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1276",
    "name": "Operating Lease Charges - Others",
    "category": "Operating Leases",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1277",
    "name": "Operating Lease - Land & Buildings",
    "category": "Operating Leases",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1280",
    "name": "Research and Development Costs",
    "category": "Research and development",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1290",
    "name": "Exceptional Items",
    "category": "Other exceptional items",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1291",
    "name": "Reorganisation and Restructuring Costs",
    "category": "Other exceptional items",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1292",
    "name": "Profit/Loss on Sale or Termination of an Operation",
    "category": "Other exceptional items",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14200",
    "name": "Directors Salaries",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14210",
    "name": "Directors Fees",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14220",
    "name": "Directors Employers PAYE & NI Contributions",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14230",
    "name": "Directors Pension Contributions",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14240",
    "name": "Directors Pension Current Service Costs",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14250",
    "name": "Directors Pension Past Service Costs",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14260",
    "name": "Directors Benefits in Kind",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14270",
    "name": "Directors Compensation for Loss of Office",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14280",
    "name": "Directors Payments to Third Parties",
    "category": "Directors Emoluments",
    "group_name": "Cost of Sales",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1300",
    "name": "Wages & Salaries",
    "category": "Staff Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1301",
    "name": "Employer's PAYE & NI Contributions",
    "category": "Staff Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1302",
    "name": "Pension Contributions",
    "category": "Staff Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1340",
    "name": "Depreciation Charge: Freehold Properties",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1341",
    "name": "Depreciation Charge: Leasehold Properties",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1342",
    "name": "Depreciation Charge: Plant & Machinery",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1343",
    "name": "Depreciation Charge: Motor Vehicles",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1344",
    "name": "Depreciation Charge: Fixtures & Fittings",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1345",
    "name": "Depreciation Charge: Computer Equipment",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1346",
    "name": "Depreciation Charge: Land & Buildings",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8509",
    "name": "Depreciation Charge: Improvements to property",
    "category": "Depreciation Charges",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1350",
    "name": "Profit/Loss on Sale (Tangible Fixed Assets)",
    "category": "Profit/Loss on Sale of Fixed Assets",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1360",
    "name": "Impairment Losses (Tangible Fixed Assets)",
    "category": "Impairment Losses",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1370",
    "name": "Packaging Materials",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1371",
    "name": "Transport, Freight & Carriage",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1372",
    "name": "Courier Service",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1373",
    "name": "Vehicle Hire",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1374",
    "name": "Vehicle Leasing Charges",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1375",
    "name": "Vehicle Maintenance",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1376",
    "name": "Vehicle Insurance",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1377",
    "name": "Diesel and Petrol",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1378",
    "name": "Commissions Payable",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1379",
    "name": "Advertising",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1380",
    "name": "Exhibitions",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1381",
    "name": "Website Costs",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1382",
    "name": "Entertainment",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1383",
    "name": "Storage",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1384",
    "name": "Cash Discount",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "13846",
    "name": "Advertising Costs (Disallowable)",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "13847",
    "name": "Other Expenses (Disallowable)",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1388",
    "name": "Entertainment (Disallowable)",
    "category": "Other Selling and Distribution Costs",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1385",
    "name": "Operating Lease Charges - Plant & Equipment",
    "category": "Operating Leases",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1386",
    "name": "Operating Lease Charges - Others",
    "category": "Operating Leases",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1387",
    "name": "Operating Lease - Land & Buildings",
    "category": "Operating Leases",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1390",
    "name": "Exceptional Items",
    "category": "Other exceptional items",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1391",
    "name": "Reorganisation and Restructuring Costs",
    "category": "Other exceptional items",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1392",
    "name": "Profit/Loss on Sale or Termination of an Operation",
    "category": "Other exceptional items",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14201",
    "name": "Directors Salaries",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14211",
    "name": "Directors Fees",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14222",
    "name": "Directors Employers PAYE & NI Contributions",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14233",
    "name": "Directors Pension Contributions",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14244",
    "name": "Directors Pension Current Service Costs",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14255",
    "name": "Directors Pension Past Service Costs",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14266",
    "name": "Directors Benefits in Kind",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14277",
    "name": "Directors Compensation for Loss of Office",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14288",
    "name": "Directors Payments to Third Parties",
    "category": "Directors Emoluments",
    "group_name": "Selling and Distribution Costs",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1400",
    "name": "Wages & Salaries",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1401",
    "name": "Employer's PAYE & NI Contributions",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1402",
    "name": "Pension Contributions",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1403",
    "name": "Pension Current Service Cost",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1404",
    "name": "Pension Past Service Cost",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1405",
    "name": "Equity-Settled Share-Based Payments",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14080",
    "name": "Bonus",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14094",
    "name": "Staff Costs (Disallowable)",
    "category": "Staff Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1410",
    "name": "Staff Training",
    "category": "Other staff costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1411",
    "name": "Staff Welfare",
    "category": "Other staff costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1412",
    "name": "Temporary Staff & Recruitment",
    "category": "Other staff costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1413",
    "name": "Other Staff-Related Expenses",
    "category": "Other staff costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1420",
    "name": "Directors Salaries",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1421",
    "name": "Directors Fees",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1422",
    "name": "Directors Employer's PAYE & NI Contributions",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1423",
    "name": "Directors Pension Contributions",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1424",
    "name": "Directors Pension Current Service Costs",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1425",
    "name": "Directors Pension Past Service Costs",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1426",
    "name": "Directors Benefits in Kind",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1427",
    "name": "Directors Compensation for Loss of Office",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1428",
    "name": "Directors Payments to Third Parties",
    "category": "Directors Emoluments",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1430",
    "name": "Auditors Remuneration",
    "category": "Professional Fees",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1431",
    "name": "Accountancy Fees",
    "category": "Professional Fees",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1432",
    "name": "Legal and Professional Fees (Allowable)",
    "category": "Professional Fees",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1433",
    "name": "Legal and Professional Fees (Disallowable)",
    "category": "Professional Fees",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14333",
    "name": "Professional Fees (Disallowable)",
    "category": "Professional Fees",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14340",
    "name": "Management & Consultancy fees",
    "category": "Professional Fees",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1440",
    "name": "Rates & Water",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1441",
    "name": "Rent",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1442",
    "name": "Light, Heat & Power",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1443",
    "name": "Property Insurance",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1444",
    "name": "Property Maintenance (Allowable)",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1445",
    "name": "Property Maintenance (Disallowable)",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1446",
    "name": "Cleaning of Premises",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1447",
    "name": "Other Premises Costs",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1457",
    "name": "Use of Home as Office",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14571",
    "name": "Premises Running Cost (Disallowable)",
    "category": "Premises Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1460",
    "name": "Petrol and Oil",
    "category": "Motor & Travel Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1461",
    "name": "Motor Licenses and Insurances",
    "category": "Motor & Travel Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1462",
    "name": "Motor Repairs and Servicing",
    "category": "Motor & Travel Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1463",
    "name": "General Travel Expenses",
    "category": "Motor & Travel Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1464",
    "name": "Overseas Travel",
    "category": "Motor & Travel Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "14642",
    "name": "Travelling Costs (Disallowable)",
    "category": "Motor & Travel Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1510",
    "name": "Discount Allowed",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1511",
    "name": "Bad Debts Written Off (Specific)",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1512",
    "name": "Provision for Doubtful Debts",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1517",
    "name": "Bank Charges",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "15170",
    "name": "Payment Gateway Charges",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "15190",
    "name": "Financial Costs (Disallowable)",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "15191",
    "name": "Bad Debts (Disallowable)",
    "category": "Finance Costs",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1520",
    "name": "Exchange Rate Losses/Gains",
    "category": "Exchange Rate Losses and Gains",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1540",
    "name": "Depreciation Charge: Freehold Properties",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1541",
    "name": "Depreciation Charge: Leasehold Properties",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1542",
    "name": "Depreciation Charge: Plant & Machinery",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1543",
    "name": "Depreciation Charge: Motor Vehicles",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1544",
    "name": "Depreciation Charge: Fixtures & Fittings",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1545",
    "name": "Depreciation Charge: Computer Equipment",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1546",
    "name": "Amortisation (Intangible Fixed Assets) - Goodwill",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1547",
    "name": "Amortisation (Intangible Fixed Assets) - R&D",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1548",
    "name": "Amortisation (Intangible Fixed Assets) - Other",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1549",
    "name": "Depreciation Charge: Land & Buildings",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8300",
    "name": "Amortisation (Intangible Fixed Assets) - Patents",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8301",
    "name": "Amortisation (Intangible Fixed Assets) - Trade Mark",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8302",
    "name": "Amortisation (Intangible Fixed Assets) - Franchise Fees",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8303",
    "name": "Amortisation (Intangible Fixed Assets) - Copy Rights",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8304",
    "name": "Amortisation (Intangible Fixed Assets) - Software License",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8510",
    "name": "Depreciation Charge: Improvements to property",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "8511",
    "name": "Depreciation Charge - Investment in Properties",
    "category": "Depreciation Charges",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1550",
    "name": "Profit/Loss on Sale (Tangible Fixed Assets)",
    "category": "Profit/Loss on Sale of Fixed Assets",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1551",
    "name": "Profit/Loss on Sale (Intangible Fixed Assets)",
    "category": "Profit/Loss on Sale of Fixed Assets",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1552",
    "name": "Profit/Loss on Sale (Fixed Assets Investment)",
    "category": "Profit/Loss on Sale of Fixed Assets",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1560",
    "name": "Impairment Losses (Tangible FA)",
    "category": "Impairment Losses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1561",
    "name": "Impairment Losses (Intangible FA)",
    "category": "Impairment Losses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1571",
    "name": "Advertising",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1572",
    "name": "Entertainment",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1573",
    "name": "General Insurance",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1574",
    "name": "Computer Expenses",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1575",
    "name": "Repairs & Renewals",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1576",
    "name": "Stationery & Postage",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1577",
    "name": "Telephone, Fax & Internet",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1578",
    "name": "Canteen",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1579",
    "name": "Sundry Expenses",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1580",
    "name": "Donations",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1581",
    "name": "Donations (Disallowable)",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1582",
    "name": "Entertainment (Disallowable)",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "15824",
    "name": "Admin Cost (Disallowable)",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "15825",
    "name": "Other Expenses (Disallowable)",
    "category": "Other Administrative Expenses",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1585",
    "name": "Operating Lease Charges - Plant & Equipment",
    "category": "Operating Leases",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1586",
    "name": "Operating Lease Charges - Others",
    "category": "Operating Leases",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1587",
    "name": "Operating Lease - Land & Buildings",
    "category": "Operating Leases",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1590",
    "name": "Exceptional Item",
    "category": "Other exceptional items",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1591",
    "name": "Reorganisation and Restructuring Costs",
    "category": "Other exceptional items",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1592",
    "name": "Profit/Loss on Sale or Termination of an Operation",
    "category": "Other exceptional items",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "15930",
    "name": "Loss on theft of Asset",
    "category": "Other exceptional items",
    "group_name": "Administrative Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1600",
    "name": "Exceptional Items",
    "category": "Exceptional Items",
    "group_name": "FRS 3 Exceptional Items",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1601",
    "name": "Profit/Loss on Sale or Termination of an Operation",
    "category": "Exceptional Items",
    "group_name": "FRS 3 Exceptional Items",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1602",
    "name": "Reorganisation and Restructuring Costs",
    "category": "Exceptional Items",
    "group_name": "FRS 3 Exceptional Items",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "1603",
    "name": "Exceptional Profits/Losses on Disposal of Fixed Assets",
    "category": "Exceptional Items",
    "group_name": "FRS 3 Exceptional Items",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2000",
    "name": "Government Grants",
    "category": "Grants",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2060",
    "name": "SEISS Grant",
    "category": "Grants",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2010",
    "name": "Exchange Rate Gains",
    "category": "Exchange Rate Gains",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2020",
    "name": "Exceptional item",
    "category": "Other exceptional items",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2030",
    "name": "Rents Received",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2031",
    "name": "Discount Received",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2032",
    "name": "Commissions Received",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2033",
    "name": "Other Operating Income (Taxable)",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2034",
    "name": "Other Operating Income (Not-Taxable)",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2035",
    "name": "Management Charges Receivable",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2036",
    "name": "VAT Flat Rate Adjustment",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2134",
    "name": "Revaluation of Investment Properties(Non-taxable)",
    "category": "Other Operating Income",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2220",
    "name": "Profit on Sale (Tangible Fixed Assets)",
    "category": "Profit on Sale of Fixed Assets",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2221",
    "name": "Profit on Sale (Intangible Fixed Assets)",
    "category": "Profit on Sale of Fixed Assets",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2222",
    "name": "Profit on Sale (Fixed Assets Investment)",
    "category": "Profit on Sale of Fixed Assets",
    "group_name": "Other Operating Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2300",
    "name": "Shares in Group Undertakings",
    "category": "Shares in Group Undertakings",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2310",
    "name": "Participating Interests",
    "category": "Participating Interests",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2320",
    "name": "Other Fixed Asset Investments (FII)",
    "category": "Other Fixed Asset Investments (FII)",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2330",
    "name": "Other Fixed Asset Investments (UnFII)",
    "category": "Other Fixed Asset Investments (UnFII)",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2340",
    "name": "Deposit Account Interest",
    "category": "Interest Receivable",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2341",
    "name": "Loan Interest",
    "category": "Interest Receivable",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2342",
    "name": "Net Finance Income - Defined Benefit Pension Scheme",
    "category": "Interest Receivable",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2600",
    "name": "Interest Receivable and Other Income",
    "category": "Interest Receivable",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2350",
    "name": "Current Asset Investment Income",
    "category": "Current Asset Investment Income",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2360",
    "name": "Exceptional Item",
    "category": "Other exceptional items",
    "group_name": "Investment Income",
    "nature": "Income",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2400",
    "name": "Amounts W/O Investments",
    "category": "Amounts Written Off Investments",
    "group_name": "Amounts Written Off Investments",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2500",
    "name": "Bank & Other Loan Interest",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2501",
    "name": "Interest Payable to Group Undertakings",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2502",
    "name": "Mortgage Interest",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2503",
    "name": "Operating Lease: Rent of Buildings",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2504",
    "name": "Operating Lease: Equipment",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2505",
    "name": "Other Operating Leases",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2506",
    "name": "Factoring Charges",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2507",
    "name": "Hire Purchase",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2508",
    "name": "Dividends on Non-Equity Preference Shares",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2509",
    "name": "Other Interest Payable",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2510",
    "name": "Other Finance Costs",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2527",
    "name": "Interest Payable & Similar Charges (Disallowable)",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2800",
    "name": "Interest Payable",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "2820",
    "name": "Interest Payable on Hire Purchase Contracts",
    "category": "Interest Payable & Similar Charges",
    "group_name": "Interest Payable & Similar Charges",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "3000",
    "name": "UK Corporation Tax",
    "category": "Corporation Tax",
    "group_name": "Taxation",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "3010",
    "name": "Current Year Deferred Tax",
    "category": "Deferred Tax",
    "group_name": "Taxation",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "3020",
    "name": "Adjustment in Respect of Prior Period Deferred Tax",
    "category": "Deferred Tax",
    "group_name": "Taxation",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "9999",
    "name": "Suspense Account",
    "category": "Suspense Account",
    "group_name": "Suspense",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "17000",
    "name": "Property Taxes",
    "category": "Property income related Expenses",
    "group_name": "Other Operating Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "17010",
    "name": "Property Expenses",
    "category": "Property income related Expenses",
    "group_name": "Other Operating Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "17020",
    "name": "Repairs & Maintenance",
    "category": "Property income related Expenses",
    "group_name": "Other Operating Expenses",
    "nature": "Expenses",
    "statement": "Profit & Loss",
    "status": "Normal"
  },
  {
    "nominal_code": "4020",
    "name": "Goodwill - Cost b/fwd",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4021",
    "name": "Goodwill - Additions Cost",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4022",
    "name": "Goodwill - Disposals Cost",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4023",
    "name": "Goodwill - Revaluation",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4024",
    "name": "Goodwill - Transfer",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4025",
    "name": "Goodwill - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4026",
    "name": "Goodwill - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4027",
    "name": "Goodwill - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - Goodwill",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4030",
    "name": "Other Intangible - Cost b/fwd",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4031",
    "name": "Other Intangible - Additions Cost",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4032",
    "name": "Other Intangible - Disposals Cost",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4033",
    "name": "Other Intangible - Revaluation",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4034",
    "name": "Other Intangible - Transfer",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4035",
    "name": "Other Intangible - Accumulated Amortisation b/fwd",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4036",
    "name": "Other Intangible - Amortisation Charge for Year",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4037",
    "name": "Other Intangible - Amortisation on Disposals",
    "category": "Other Intangible Assets",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4040",
    "name": "Freehold Property - Cost b/fwd",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4041",
    "name": "Freehold Property - Additions - Cost",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4042",
    "name": "Freehold Property - Disposals - Cost",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4043",
    "name": "Freehold Property - Revaluations",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4044",
    "name": "Freehold Property - Transfers",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4045",
    "name": "Freehold Property - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4046",
    "name": "Freehold Property - Depreciation Charge for the Year",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4047",
    "name": "Freehold Property - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Land & Buildings Freehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4050",
    "name": "Leasehold Property - Cost b/fwd",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4051",
    "name": "Leasehold Property - Additions - Cost",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4052",
    "name": "Leasehold Property - Disposals - Cost",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4053",
    "name": "Leasehold Property - Revaluations",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4054",
    "name": "Leasehold Property - Transfers",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4055",
    "name": "Leasehold Property - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4056",
    "name": "Leasehold Property - Depreciation Charge for Year",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4057",
    "name": "Leasehold Property - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Land & Buildings Leasehold",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4060",
    "name": "Plant & Machinery - Cost b/fwd",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4061",
    "name": "Plant & Machinery - Additions - Cost",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4062",
    "name": "Plant & Machinery - Disposals - Cost",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4063",
    "name": "Plant & Machinery - Revaluations",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4064",
    "name": "Plant & Machinery - Transfer",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4065",
    "name": "Plant & Machinery - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4066",
    "name": "Plant & Machinery - Depreciation Charge for the Year",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4067",
    "name": "Plant & Machinery - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Plant & Machinery",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4080",
    "name": "Motor Vehicles - Cost b/fwd",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4081",
    "name": "Motor Vehicles - Additions - Cost",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4082",
    "name": "Motor Vehicles - Disposals - Cost",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4083",
    "name": "Motor Vehicles - Revaluations",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4084",
    "name": "Motor Vehicles - Transfers",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4085",
    "name": "Motor Vehicles - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4086",
    "name": "Motor Vehicles - Depreciation Charge for the Year",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4087",
    "name": "Motor Vehicles - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Motor Vehicles",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4100",
    "name": "Fixtures & Fittings - Cost b/fwd",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4101",
    "name": "Fixtures & Fittings - Additions - Cost",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4102",
    "name": "Fixtures & Fittings - Disposals - Cost",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4103",
    "name": "Fixtures & Fittings - Revaluations",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4104",
    "name": "Fixtures & Fittings - Transfers",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4105",
    "name": "Fixtures & Fittings - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4106",
    "name": "Fixtures & Fittings - Depreciation Charge for Year",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4107",
    "name": "Fixtures & Fittings - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Fixtures & Fittings",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4120",
    "name": "Computer Equipment - Cost b/fwd",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4121",
    "name": "Computer Equipment - Additions - Cost",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4122",
    "name": "Computer Equipment - Disposals - Cost",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4123",
    "name": "Computer Equipment - Revaluations",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4124",
    "name": "Computer Equipment - Transfers",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4125",
    "name": "Computer Equipment - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4126",
    "name": "Computer Equipment - Depreciation Charge for the Year",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4127",
    "name": "Computer Equipment - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Computer Equipment",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4010",
    "name": "R&D - Cost b/fwd",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4011",
    "name": "R&D - Additions Cost",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4012",
    "name": "R&D - Disposals Cost",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4013",
    "name": "R&D - Revaluation",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4014",
    "name": "R&D - Transfer",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4015",
    "name": "R&D - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4016",
    "name": "R&D - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4017",
    "name": "R&D - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - R&D",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4072",
    "name": "Investment Properties - Disposals - Cost",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4073",
    "name": "Investment Properties - Revaluations",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4074",
    "name": "Investment Properties - Transfer",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4090",
    "name": "Investment Properties - Cost b/fwd",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4091",
    "name": "Investment Properties - Additions - Cost",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4095",
    "name": "Investment Properties - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4097",
    "name": "Investment Properties - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4506",
    "name": "Investment Properties - Depreciation Charge for the Year",
    "category": "Tangible Fixed Assets - InvestmentProperties",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4800",
    "name": "Patents - Cost b/fwd",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4801",
    "name": "Patents - Additions Cost",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4802",
    "name": "Patents - Disposals Cost",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4803",
    "name": "Patents - Revaluation",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4804",
    "name": "Patents - Transfer",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4805",
    "name": "Patents - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4806",
    "name": "Patents - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4807",
    "name": "Patents - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - Patents",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4810",
    "name": "Trade Mark - Cost b/fwd",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4811",
    "name": "Trade Mark - Additions Cost",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4812",
    "name": "Trade Mark - Disposals Cost",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4813",
    "name": "Trade Mark - Revaluation",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4814",
    "name": "Trade Mark - Transfer",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4815",
    "name": "Trade Mark - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4816",
    "name": "Trade Mark - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4817",
    "name": "Trade Mark - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - Trade Mark",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4820",
    "name": "Franchise Fees - Cost b/fwd",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4821",
    "name": "Franchise Fees - Additions Cost",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4822",
    "name": "Franchise Fees - Disposals Cost",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4823",
    "name": "Franchise Fees - Revaluation",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4824",
    "name": "Franchise Fees - Transfer",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4825",
    "name": "Franchise Fees - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4826",
    "name": "Franchise Fees - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4827",
    "name": "Franchise Fees - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - Franchise Fees",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4830",
    "name": "Copy Rights - Cost b/fwd",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4831",
    "name": "Copy Rights - Additions Cost",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4832",
    "name": "Copy Rights - Disposals Cost",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4833",
    "name": "Copy Rights - Revaluation",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4834",
    "name": "Copy Rights - Transfer",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4835",
    "name": "Copy Rights - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4836",
    "name": "Copy Rights - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4837",
    "name": "Copy Rights - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - Copy Rights",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4840",
    "name": "Software License - Cost b/fwd",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4841",
    "name": "Software License - Additions Cost",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4842",
    "name": "Software License - Disposals Cost",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4843",
    "name": "Software License - Revaluation",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4844",
    "name": "Software License - Transfer",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4845",
    "name": "Software License - Accumulated Amortisation b/fwd",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4846",
    "name": "Software License - Amortisation Charge for the Year",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4847",
    "name": "Software License - Amortisation on Disposals",
    "category": "Intangible Fixed Assets - Software License",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8500",
    "name": "Improvements to property - Cost b/fwd",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8501",
    "name": "Improvements to property - Additions Cost",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8502",
    "name": "Improvements to property - Disposals Cost",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8503",
    "name": "Improvements to property - Revaluations",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8504",
    "name": "Improvements to property - Transfers",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8505",
    "name": "Improvements to property - Accumulated Depreciation b/fwd",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8506",
    "name": "Improvements to property - Depreciation Charge for the Year",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8507",
    "name": "Improvements to property - Depreciation on Disposals",
    "category": "Tangible Fixed Assets - Improvements to property",
    "group_name": "Fixed Assets",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4130",
    "name": "Land & Buildings Leased - Cost b/fwd",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4131",
    "name": "Land & Buildings Leased - Additions - Cost",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4132",
    "name": "Land & Buildings Leased - Disposals - Cost",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4133",
    "name": "Land & Buildings Leased - Revaluations",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4134",
    "name": "Land & Buildings Leased - Transfers",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4135",
    "name": "Land & Buildings Leased - Accumulated Depreciation b/fwd",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4136",
    "name": "Land & Buildings Leased - Depreciation Charge for the Year",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4137",
    "name": "Land & Buildings Leased - Depreciation on Disposal",
    "category": "Land & buildings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4140",
    "name": "Plant & Machinery  Leased - Cost b/fwd",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4141",
    "name": "Plant & Machinery  Leased - Additions - Cost",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4142",
    "name": "Plant & Machinery - Disposals - Cost  Leased",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4143",
    "name": "Plant & Machinery  Leased - Revaluations",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4144",
    "name": "Plant & Machinery  Leased - Transfers",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4145",
    "name": "Plant & Machinery Leased - Accumulated Depreciation b/fwd",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4146",
    "name": "Plant & Machinery Leased - Depreciation Charge for the Year",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4147",
    "name": "Plant & Machinery Leased - Depreciation on Disposal",
    "category": "Plant & machinery - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4150",
    "name": "Motor Vehicles  Leased - Cost b/fwd",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4151",
    "name": "Motor Vehicles  Leased - Additions - Cost",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4152",
    "name": "Motor Vehicles Leased - Disposals - Cost",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4153",
    "name": "Motor Vehicles  Leased - Revaluations",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4154",
    "name": "Motor Vehicles  Leased - Transfers",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4155",
    "name": "Motor Vehicles Leased - Accumulated Depreciation b/fwd",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4156",
    "name": "Motor Vehicles Leased - Depreciation Charge for the Year",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4157",
    "name": "Motor Vehicles Leased - Depreciation on Disposal",
    "category": "Motor vehicles - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4160",
    "name": "Fixtures & Fittings Leased - Cost b/fwd",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4161",
    "name": "Fixtures & Fittings Leased - Additions - Cost",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4162",
    "name": "Fixtures & Fittings Leased - Disposals - Cost",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4163",
    "name": "Fixtures & Fittings Leased - Revaluations",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4164",
    "name": "Fixtures & Fittings Leased - Transfers",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4165",
    "name": "Fixtures & Fittings Leased - Accumulated Depreciation b/fwd",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4166",
    "name": "Fixtures & Fittings Leased - Depreciation Charge for the Year",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4167",
    "name": "Fixtures & Fittings Leased - Depreciation on Disposal",
    "category": "Fixtures & fittings - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4170",
    "name": "Computer Equipment  Leased - Cost b/fwd",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4171",
    "name": "Computer Equipment  Leased - Additions - Cost",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4172",
    "name": "Computer Equipment Leased - Disposals - Cost",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4173",
    "name": "Computer Equipment  Leased - Revaluations",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4174",
    "name": "Computer Equipment  Leased - Transfers",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4175",
    "name": "Computer Equipment Leased - Accumulated Depreciation b/fwd",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4176",
    "name": "Computer Equipment Leased - Depreciation Charge for the Year",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4177",
    "name": "Computer Equipment Leased - Depreciation on Disposal",
    "category": "Computer equipment - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4190",
    "name": "Investment Properties Leased - Cost b/fwd",
    "category": "InvestmentProperties - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4191",
    "name": "Investment Properties Leased - Additions - Cost",
    "category": "InvestmentProperties - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4192",
    "name": "Investment Properties - Disposals - Cost Leased",
    "category": "InvestmentProperties - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4193",
    "name": "Investment Properties - Leased - Revaluations",
    "category": "InvestmentProperties - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4194",
    "name": "Investment Properties - Leased - Transfers",
    "category": "InvestmentProperties - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4310",
    "name": "Improvements to property leased- Cost b/fwd",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4311",
    "name": "Improvements to property leased- Additions Cost",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4312",
    "name": "Improvements to property leased- Disposals Cost",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4313",
    "name": "Improvements to property leased- Revaluations",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4314",
    "name": "Improvements to property leased- Transfers",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4315",
    "name": "Improvements to property leased- Accumulated Depreciation b/fwd",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4316",
    "name": "Improvements to property leased- Depreciation Charge for the Year",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4317",
    "name": "Improvements to property leased- Depreciation on Disposals",
    "category": "Improvements to property - Leased & HP",
    "group_name": "Fixed Assets – Leased",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4200",
    "name": "Shares in Group - Cost b/fwd",
    "category": "Shares in Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4201",
    "name": "Shares in Group - Additions",
    "category": "Shares in Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4202",
    "name": "Shares in Group - Cost of Disposals",
    "category": "Shares in Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4203",
    "name": "Shares in Group - Revaluations",
    "category": "Shares in Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4204",
    "name": "Shares in Group - Aggregate Amount W/Off",
    "category": "Shares in Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4210",
    "name": "Loans to Group - Cost b/fwd",
    "category": "Loans to Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4211",
    "name": "Loans to Group - Additions",
    "category": "Loans to Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4212",
    "name": "Loans to Group - Cost of Disposals",
    "category": "Loans to Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4213",
    "name": "Loans to Group - Revaluations",
    "category": "Loans to Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4214",
    "name": "Loans to Group - Aggregate Amount W/Off",
    "category": "Loans to Group Undertakings",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4220",
    "name": "Participating Ints - Cost b/fwd",
    "category": "Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4221",
    "name": "Participating Ints - Additions",
    "category": "Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4222",
    "name": "Participating Ints - Cost of Disposals",
    "category": "Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4223",
    "name": "Participating Ints - Revaluations",
    "category": "Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4224",
    "name": "Participating Ints - Aggregate Amount W/Off",
    "category": "Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4230",
    "name": "Loans to Participating Ints - Cost b/fwd",
    "category": "Loans to Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4231",
    "name": "Loans to Participating Ints - Additions",
    "category": "Loans to Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4232",
    "name": "Loans to Participating Ints - Cost of Disposals",
    "category": "Loans to Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4233",
    "name": "Loans to Participating Ints - Revaluations",
    "category": "Loans to Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4234",
    "name": "Loans to Participating Ints - Aggregate Amount W/Off",
    "category": "Loans to Participating Interests",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4240",
    "name": "Investment in Own Shares - Cost b/fwd",
    "category": "Investment in own shares",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4241",
    "name": "Investment in Own Shares - Additions",
    "category": "Investment in own shares",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4242",
    "name": "Investment in Own Shares - Cost of Disposals",
    "category": "Investment in own shares",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4243",
    "name": "Investment in Own Shares - Revaluations",
    "category": "Investment in own shares",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4244",
    "name": "Investment in Own Shares - Aggregate Amount W/Off",
    "category": "Investment in own shares",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4250",
    "name": "Other Investments - Listed - Cost b/fwd",
    "category": "Other investments – Listed",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4251",
    "name": "Other Investments - Listed - Additions",
    "category": "Other investments – Listed",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4252",
    "name": "Other Investments - Listed - Cost of Disposals",
    "category": "Other investments – Listed",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4253",
    "name": "Other Investments - Listed - Revaluations",
    "category": "Other investments – Listed",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4254",
    "name": "Other Investments - Listed - Aggregate Amount W/Off",
    "category": "Other investments – Listed",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4260",
    "name": "Other Investments - Unlisted - Cost b/fwd",
    "category": "Other investments – Unlisted",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4261",
    "name": "Other Investments - Unlisted - Additions",
    "category": "Other investments – Unlisted",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4262",
    "name": "Other Investments - Unlisted - Cost of Disposals",
    "category": "Other investments – Unlisted",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4263",
    "name": "Other Investments - Unlisted - Revaluations",
    "category": "Other investments – Unlisted",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4264",
    "name": "Other Investments - Unlisted - Aggregate Amount W/Off",
    "category": "Other investments – Unlisted",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4270",
    "name": "Investment in Assets - Cost b/fwd",
    "category": "Investment in Assets",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4271",
    "name": "Investment in Assets - Additions",
    "category": "Investment in Assets",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4272",
    "name": "Investment in Assets - Cost of Disposals",
    "category": "Investment in Assets",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4273",
    "name": "Investment in Assets - Revaluations",
    "category": "Investment in Assets",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4274",
    "name": "Investment in Assets - Aggregate Amount W/Off",
    "category": "Investment in Assets",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4275",
    "name": "Investment in Assets - Transfer to/ From Tangible fixed assets",
    "category": "Investment in Assets",
    "group_name": "Fixed Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4420",
    "name": "Finished Goods",
    "category": "Stocks",
    "group_name": "Stocks",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4421",
    "name": "Work in Progress",
    "category": "Stocks",
    "group_name": "Stocks",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4422",
    "name": "Raw Materials",
    "category": "Stocks",
    "group_name": "Stocks",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4423",
    "name": "Stocks",
    "category": "Stocks",
    "group_name": "Stocks",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4440",
    "name": "Payments on Account",
    "category": "Payments on Account",
    "group_name": "Stocks",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4460",
    "name": "Long Term Contracts",
    "category": "Long Term Contracts",
    "group_name": "Stocks",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4600",
    "name": "Trade Debtors",
    "category": "Trade Debtors",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4601",
    "name": "Provision for Doubtful Debts",
    "category": "Trade Debtors",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4610",
    "name": "Amount Owed by Group Undertakings",
    "category": "Amounts Owed by Group Undertakings & Participating Interests",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4611",
    "name": "Amount Owed by Participating Interests",
    "category": "Amounts Owed by Group Undertakings & Participating Interests",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4620",
    "name": "Called up Share Capital Not Paid",
    "category": "Called Up Share Capital Not Paid",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4621",
    "name": "Premium on Called up Share Capital Not Paid",
    "category": "Called Up Share Capital Not Paid",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4630",
    "name": "Prepayments & Accrued Income",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4631",
    "name": "Accrued Income",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4632",
    "name": "Accrued Interest Receivable",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4633",
    "name": "Advance Received",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4634",
    "name": "Deposits paid",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4640",
    "name": "Amounts Recoverable on Contracts",
    "category": "Other Debtors Less Than One Year",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4641",
    "name": "Debts Factored without Recourse",
    "category": "Other Debtors Less Than One Year",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4642",
    "name": "Other Debtors",
    "category": "Other Debtors Less Than One Year",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4643",
    "name": "Interest Receivable and Other Income",
    "category": "Other Debtors Less Than One Year",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4644",
    "name": "Lottery control account",
    "category": "Other Debtors Less Than One Year",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4645",
    "name": "Paypoint Control Account",
    "category": "Other Debtors Less Than One Year",
    "group_name": "Debtors Less than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4700",
    "name": "Trade Debtors",
    "category": "Trade Debtors",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4701",
    "name": "Provision for Doubtful Debts",
    "category": "Trade Debtors",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4710",
    "name": "Amount Owed by Group Undertakings",
    "category": "Amounts Owed by Group Undertakings & Participating Interests",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4711",
    "name": "Amount Owed by Participating Interests",
    "category": "Amounts Owed by Group Undertakings & Participating Interests",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4720",
    "name": "Called Up Share Capital Not Paid",
    "category": "Called Up Share Capital Not Paid",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4721",
    "name": "Premium on Called up Share Capital Not Paid",
    "category": "Called Up Share Capital Not Paid",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4730",
    "name": "Prepayments",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4731",
    "name": "Accrued Income",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4732",
    "name": "Accrued Interest Receivable",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4733",
    "name": "Deposits paid",
    "category": "Prepayments & Accrued Income",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4740",
    "name": "Amounts Recoverable on Contracts",
    "category": "Other Debtors More Than One Year",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4741",
    "name": "Debts Factored Without Recourse",
    "category": "Other Debtors More Than One Year",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4742",
    "name": "Other Debtors",
    "category": "Other Debtors More Than One Year",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "4750",
    "name": "Directors Loan Accounts",
    "category": "Directors Loan accounts",
    "group_name": "Debtors More than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5000",
    "name": "Shares in Group - Cost b/fwd",
    "category": "Shares in Group Undertakings",
    "group_name": "Current Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5040",
    "name": "Investment in Own Shares - Cost b/fwd",
    "category": "Investment in own shares",
    "group_name": "Current Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5050",
    "name": "Other Investments - Listed - Cost b/fwd",
    "category": "Other investments – Listed",
    "group_name": "Current Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5060",
    "name": "Other Investments - Unlisted - Cost b/fwd",
    "category": "Other investments – Unlisted",
    "group_name": "Current Asset Investments",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5220",
    "name": "Cash in Hand",
    "category": "Cash in Hand",
    "group_name": "Cash at Bank & in Hand",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5236",
    "name": "CapiumPay Control Account",
    "category": "Bank Accounts",
    "group_name": "Cash at Bank & in Hand",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5237",
    "name": "CapiumPay",
    "category": "Bank Accounts",
    "group_name": "Cash at Bank & in Hand",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5400",
    "name": "Trade Creditors",
    "category": "Trade Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5410",
    "name": "Bank Loans & Overdrafts (Secured)",
    "category": "Bank Loans & Overdrafts",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5411",
    "name": "Bank Loans & Overdrafts",
    "category": "Bank Loans & Overdrafts",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5420",
    "name": "Amounts Owed to Group Undertakings",
    "category": "Amounts Owed to Group Undertakings & Participating Interests",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5421",
    "name": "Amounts Owed to Participating Interests",
    "category": "Amounts Owed to Group Undertakings & Participating Interests",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5430",
    "name": "Corporation Tax",
    "category": "Taxation & Social Security",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5431",
    "name": "PAYE & Social Security",
    "category": "Taxation & Social Security",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5435",
    "name": "CIS Control Account",
    "category": "Taxation & Social Security",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5440",
    "name": "Accrued Expenses",
    "category": "Accruals & Deferred Income",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5441",
    "name": "Deferred Grants",
    "category": "Accruals & Deferred Income",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5442",
    "name": "Advance Paid",
    "category": "Accruals & Deferred Income",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5450",
    "name": "Other Creditors",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5451",
    "name": "Bills of Exchange Payable",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5452",
    "name": "Dividends Payable - Equity",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5453",
    "name": "Dividends Payable - Non-Equity",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5454",
    "name": "Obligations under HP/Financial Leases",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5455",
    "name": "Payments Received on Account",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5456",
    "name": "Wages & Salaries Control Account",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5457",
    "name": "Interest Payable",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5458",
    "name": "Intra-Group Interest Payable",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5459",
    "name": "Attachment of Earnings",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5476",
    "name": "Proposed Dividend",
    "category": "Other Creditors",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5460",
    "name": "Debenture Loans",
    "category": "Debenture Loans",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5461",
    "name": "Debenture Loans - Convertible",
    "category": "Debenture Loans",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5470",
    "name": "Preference Shares b/fwd",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5471",
    "name": "Issue of New Preference Share Capital at Par",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5472",
    "name": "Other Issues",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5473",
    "name": "Purchase of Own Shares",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5474",
    "name": "Prior Year Adjustment",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5475",
    "name": "Transfers from NEPS Less than 1 Year",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5480",
    "name": "Directors' Current Accounts",
    "category": "Directors' current accounts",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5432",
    "name": "VAT",
    "category": "VAT Control Account",
    "group_name": "Creditors Less Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5500",
    "name": "Trade Creditors",
    "category": "Trade Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5510",
    "name": "Bank Loans & Overdrafts (secured)",
    "category": "Bank Loans & Overdrafts",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5511",
    "name": "Bank Loans & Overdrafts",
    "category": "Bank Loans & Overdrafts",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5520",
    "name": "Amounts Owed to Group Undertakings",
    "category": "Amounts Owed to Group Undertakings & Participating Interests",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5521",
    "name": "Amounts Owed to Participating Interests",
    "category": "Amounts Owed to Group Undertakings & Participating Interests",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5540",
    "name": "Accrued Expenses",
    "category": "Accruals & Deferred Income",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5541",
    "name": "Deferred Grants",
    "category": "Accruals & Deferred Income",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5550",
    "name": "Other Creditors",
    "category": "Other Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5551",
    "name": "Bills of Exchange Payable",
    "category": "Other Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5552",
    "name": "Dividends Payable - Equity",
    "category": "Other Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5553",
    "name": "Dividends Payable - Non-Equity",
    "category": "Other Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5554",
    "name": "Obligations Under HP/Financial Leases",
    "category": "Other Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5555",
    "name": "Payments Received on Account",
    "category": "Other Creditors",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5560",
    "name": "Debenture Loans",
    "category": "Debenture Loans",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5561",
    "name": "Debenture Loans - Convertible",
    "category": "Debenture Loans",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5570",
    "name": "Preference Shares b/fwd",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5571",
    "name": "Issue of New Preference Share Capital at Par",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5572",
    "name": "Other Issues",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5573",
    "name": "Purchase of Own Shares",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5574",
    "name": "Prior Year Adjustment",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5575",
    "name": "Transfers from NEPS greater than 1 Year",
    "category": "Non-equity Preference Shares",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5580",
    "name": "Directors' Loan Accounts",
    "category": "Directors' Loan accounts",
    "group_name": "Creditors More Than One Year",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5820",
    "name": "Deferred Tax",
    "category": "Provisions for Deferred Tax",
    "group_name": "Provisions for Liabilities",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5821",
    "name": "Charged to Profit & Loss",
    "category": "Provisions for Deferred Tax",
    "group_name": "Provisions for Liabilities",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5840",
    "name": "Pension Provisions",
    "category": "Other Provisions",
    "group_name": "Provisions for Liabilities",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "6030",
    "name": "Defined Benefit Pension Scheme Asset/Liability b/fwd",
    "category": "Defined Benefit Pension Scheme",
    "group_name": "Pension Asset/Liability",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "6031",
    "name": "DBPS : Actuarial Gain/Loss in Current Accounting Period",
    "category": "Defined Benefit Pension Scheme",
    "group_name": "Pension Asset/Liability",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7010",
    "name": "Equity Share Capital b/fwd",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7011",
    "name": "Issue of New Equity Share Capital at Par",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7012",
    "name": "Scrip/Rights Issues",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7013",
    "name": "Purchase of Own Shares",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7014",
    "name": "Other Equity Share capital",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7015",
    "name": "Prior period adjustment",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "1868582",
    "name": "Reduction of share capital",
    "category": "Equity Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7020",
    "name": "Preference Share Capital b/fwd",
    "category": "Preference Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7021",
    "name": "Issue of New Preference Share Capital at Par",
    "category": "Preference Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7022",
    "name": "Other Issues",
    "category": "Preference Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7023",
    "name": "Purchase of Own Shares",
    "category": "Preference Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "7024",
    "name": "Prior Year Adjustment",
    "category": "Preference Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "1871870",
    "name": "Reduction of share capital",
    "category": "Preference Share Capital",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8000",
    "name": "Profit & Loss Account b/fwd",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8002",
    "name": "Equity Dividends Proposed",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8003",
    "name": "Equity Dividends Paid",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8005",
    "name": "Transfer from Reserves",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8006",
    "name": "Purchase of Own Shares",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8007",
    "name": "Prior Year Adjustment",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8008",
    "name": "Transfer To Reserves",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8099",
    "name": "Donation to parent company",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8152",
    "name": "Transfer to Profit and Loss Account",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "2283864",
    "name": "Reduction of share capital",
    "category": "Accumulated Profit & Loss",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8010",
    "name": "Equity Share Premium b/fwd",
    "category": "Equity Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8011",
    "name": "Equity Share Premium - New Issue",
    "category": "Equity Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8012",
    "name": "Qualifying Equity Share Issue Expenses",
    "category": "Equity Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8013",
    "name": "Prior Year Adjustment",
    "category": "Equity Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "2233095",
    "name": "Reduction of share capital",
    "category": "Equity Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8020",
    "name": "Preference Share Premium b/fwd",
    "category": "Preference Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8021",
    "name": "Preference Share Premium - New Issue",
    "category": "Preference Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8022",
    "name": "Qualifying Preference Share Issue Expenses",
    "category": "Preference Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8023",
    "name": "Prior Year Adjustment",
    "category": "Preference Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "2236747",
    "name": "Reduction of share capital",
    "category": "Preference Share Premium",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8030",
    "name": "Revaluation Reserve b/fwd",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8031",
    "name": "Revaluation of Fixed Assets",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8032",
    "name": "Transfer to Profit and Loss Account",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8033",
    "name": "Investments w/off Revalued",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8034",
    "name": "Transfers to/from Other Reserves",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8035",
    "name": "Deferred Tax Provided on Revaluation",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8036",
    "name": "Prior Year Adjustment",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8037",
    "name": "Deferred Tax Provided on Revaluation of Trade Investments",
    "category": "Revaluation Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8040",
    "name": "Capital Redemption Reserve b/fwd",
    "category": "Capital Redemption Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8041",
    "name": "Purchase of Own Shares (Nominal Value)",
    "category": "Capital Redemption Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8042",
    "name": "Transfer to Profit and Loss account",
    "category": "Capital Redemption Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8044",
    "name": "Transfers to/from Other Reserves",
    "category": "Capital Redemption Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8046",
    "name": "Prior Year Adjustment",
    "category": "Capital Redemption Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "2245148",
    "name": "Reduction of share capital",
    "category": "Capital Redemption Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8050",
    "name": "Share Options Reserve b/fwd",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8051",
    "name": "Equity-Settled Share-Based Payments in Year",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8052",
    "name": "Exercise of Options during the Year",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8053",
    "name": "Transfer to Profit and Loss Account",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8054",
    "name": "Expiry of Share Options in the Year",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8055",
    "name": "Forfeiture of Share Options in the Year",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8056",
    "name": "Prior Year Adjustment",
    "category": "Share Options Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8070",
    "name": "Special reserves b/fwd",
    "category": "Special Reserves",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8071",
    "name": "Created during the year",
    "category": "Special Reserves",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8072",
    "name": "Transfer",
    "category": "Special Reserves",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8080",
    "name": "Other Comprehensive Income b/fwd",
    "category": "Other Comprehensive Income",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8081",
    "name": "Actuarial Gain",
    "category": "Other Comprehensive Income",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8091",
    "name": "Unrealized Gains or losses",
    "category": "Other Comprehensive Income",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8111",
    "name": "Foreign currency adjustments",
    "category": "Other Comprehensive Income",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8121",
    "name": "Gains on cash flow hedges",
    "category": "Other Comprehensive Income",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8150",
    "name": "Fair Value Reserve b/fwd",
    "category": "Fair Value Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8151",
    "name": "Fair Value Reserve",
    "category": "Fair Value Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "2283133",
    "name": "Transfer to Profit and Loss Account",
    "category": "Fair Value Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8160",
    "name": "General Reserve",
    "category": "General Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "8161",
    "name": "General Reserve b/fwd",
    "category": "General Reserve",
    "group_name": "Capital & Reserves",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5660",
    "name": "Accrued expenses",
    "category": "Accruals & Deferred income",
    "group_name": "Accruals & Deferred income",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5661",
    "name": "Deferred Grants",
    "category": "Accruals & Deferred income",
    "group_name": "Accruals & Deferred income",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  },
  {
    "nominal_code": "5662",
    "name": "Accrued& Deferred income",
    "category": "Accruals & Deferred income",
    "group_name": "Accruals & Deferred income",
    "nature": "Assets",
    "statement": "Balance Sheet",
    "status": "Normal"
  }
];
