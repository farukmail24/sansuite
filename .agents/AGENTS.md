# AGENTS.md - Project Behavioral Rules & Guidelines

## 1. MANDATORY MASTER MEMORY & ARCHITECTURE LOOKUP
- **SANSUITE MASTER MEMORY**: The single source of truth for the entire ecosystem is [`SANSUITE_MASTER_MEMORY.md`](file:///d:/sansuite/SANSUITE_MASTER_MEMORY.md).
- Whenever the user mentions any module, option, statutory formula, UI route, or backend endpoint (e.g. Practice Management, Accounts Production FRS 102/105, CT600, Bookkeeping, MTD VAT, Payroll RTI, Self Assessment SA100, Capisign, AML, Company Secretarial, Time & Fees, Client Portal 365), **immediately refer to [`SANSUITE_MASTER_MEMORY.md`](file:///d:/sansuite/SANSUITE_MASTER_MEMORY.md)** for instant context, database tables, business rules, and file paths.

## 2. MANDATORY UI & DESIGN RULE: NO EMOJIS
- **NEVER use Emojis** anywhere in application UI, labels, status text, buttons, modals, cards, toast notifications, or icons across any project component.
- **ALWAYS use SVG / Lucide React Icons** (e.g., `<Building2 />`, `<FileText />`, `<Calculator />`, `<Shield />`, `<CheckCircle2 />`, `<AlertCircle />`, `<Trash2 />`, `<Plus />`, `<RefreshCw />`) instead of text emojis.

## 3. CODE QUALITY & COMPILATION
- Ensure all TypeScript code compiles with **0 errors** using `npm run check` (`tsc`).
- Preserve MySQL database schema consistency in database `sansuite`.

## 4. UI INSPIRATION & USER-FRIENDLINESS MANDATE
- **Always use provided UI screenshots as design and workflow inspiration** to build ultra-modern, user-friendly, dynamic, and comprehensive features.
- Never settle for simple mockups; provide rich line-item calculations, chart-of-accounts mapping, VAT rate breakdowns, instant search/filtering, and seamless action workflows.

## 5. MODULAR ISOLATION & NO CROSS-MODULE NAVIGATION LINKING MANDATE
- **Modular Subscription Architecture**: SanSuite is sold modularly. A firm or user may subscribe to only one or a subset of modules (e.g. only Practice Management, only Bookkeeping, or only Payroll).
- **Strict Module Independence**: NEVER link foreign/external module pages inside a specific module's top header navigation, sidebar, or settings dropdown (e.g., do NOT link My Admin `/admin/users` or `/admin` or Time & Fees inside Practice Management header menus).
- **Dedicated Settings Menus**: Each module's Settings dropdown must contain ONLY its own module-specific settings (e.g. Practice Management Settings dropdown MUST contain: Services, Custom Fields, Email Templates, Document Templates, Onboarding and KYC, Risk Assessment).

## 6. STRICT PRODUCTION INTEGRITY: ZERO MOCK DATA MANDATE
- **NEVER use Mock, Fake, Auto-Seeded, or Hardcoded Fallback Data** anywhere in application UI, forms, backend API responses, or database tables.
- **Production Standard**: All rendered information must originate strictly from authentic MySQL database records or external live statutory APIs (e.g. Companies House / HMRC).
- **Mandatory Clean Empty States (Zero State)**:
  - If a table, list, or record is empty in the database, NEVER show dummy placeholder cards or fake calculations.
  - ALWAYS render a clean, professional, purpose-built **Empty State** with an explanation and an action button (e.g. `+ Log Staff AML Training`, `+ Add Client`) allowing the user to create real records.
- **Clean Input Defaults**: Modal and form inputs must never pre-fill fake names, test emails, or dummy certificates. Placeholders must be instructional only (e.g. `placeholder="Enter staff name"`).

## 7. CAPIUM-INSPIRED FUNCTIONALITY & STRICT INTELLECTUAL PROPERTY / COPYRIGHT COMPLIANCE
- **100% Workflow & Functional Parity**: SanSuite is inspired by Capium's comprehensive UK accounting, bookkeeping, and practice management workflows. We must preserve and match 100% of the operational logic, options, calculations, statutory formulas, and user workflows so no feature is omitted.
- **STRICTLY NO VISUAL CLONING (Copyright Protection)**: NEVER copy or clone Capium's visual theme, cyan/yellow color palette, exact layouts, or brand styling to prevent any copyright or IP issues.
- **Original SanSuite Design System**: All interfaces must be designed natively using SanSuite's premium purple/slate/emerald modern aesthetic, Lucide React SVG icons (never emojis), smooth glassmorphism, responsive cards, and clean zero-state tables.
