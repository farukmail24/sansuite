# Master Plan & Development Roadmap

এই মাস্টার প্ল্যানটি ধাপে ধাপে একটি স্কেলেবল, মাল্টি-ট্যানেন্ট (Multi-tenant) এবং এন্টারপ্রাইজ গ্রেড অ্যাকাউন্টিং ও প্র্যাকটিস ম্যানেজমেন্ট সফটওয়্যার (যেমন SanSuite) তৈরি করার জন্য ডিজাইন করা হয়েছে। 

আমাদের টেকনোলজি স্ট্যাক: **Node.js (Express) + TypeScript + React (Vite) + PostgreSQL (Drizzle ORM) + Tailwind CSS + Redis**.

---

## Phase 1: Architecture Setup & Infrastructure (ভিত্তি স্থাপন)
এই ধাপে আমরা প্রোজেক্টের বেস স্ট্রাকচার এবং ডেটাবেস সেটআপ করব।

*   **Step 1.1: Monorepo Initialization:** `client`, `server`, এবং `shared` (Types/Zod schemas) ফোল্ডার স্ট্রাকচার তৈরি করা।
*   **Step 1.2: Database Design:** PostgreSQL এ Multi-tenancy আর্কিটেকচার (Schema-per-tenant বা Row-level security) ডিজাইন করা। 
*   **Step 1.3: ORM Setup:** Drizzle ORM কনফিগার করা এবং গ্লোবাল স্কিমা (যেমন: Users, Practices, Subscriptions) তৈরি করা।
*   **Step 1.4: UI Scaffolding:** React, Vite, Tailwind CSS, এবং Radix/Shadcn UI সেটআপ করা।
*   **Step 1.5: DevOps & CI/CD:** Github এ কোড পুশ করা এবং Coolify বা Docker এর মাধ্যমে প্রাথমিক অটো-ডেপ্লয়মেন্ট পাইপলাইন রেডি করা।

---

## Phase 2: Core Authentication & Multi-Tenancy (সিকিউরিটি এবং ইউজার এক্সেস)
সিস্টেমে ইউজারদের লগিন এবং ফার্মগুলোর সাব-ডোমেন ম্যানেজমেন্ট করা।

*   **Step 2.1: Auth System:** JWT বা Session ভিত্তিক Authentication তৈরি করা (Bcrypt + Passport.js)।
*   **Step 2.2: Subdomain Middleware:** Express সার্ভারে `req.hostname` দিয়ে সাব-ডোমেন ডিটেক্ট করা এবং ইউজারের নির্দিষ্ট ডেটাবেস স্কিমাতে কানেক্ট করা।
*   **Step 2.3: Onboarding Flow:** নতুন অ্যাকাউন্টিং ফার্ম রেজিস্ট্রেশন করার সিস্টেম এবং তাদের প্রাথমিক ড্যাশবোর্ড তৈরি করা।
*   **Step 2.4: Roles & Permissions:** অ্যাডমিন, স্টাফ, এবং ক্লায়েন্ট ইউজারদের জন্য Role-Based Access Control (RBAC) তৈরি করা।

---

## Phase 3: The Accounting Engine (সিস্টেমের হার্ট)
ডাবল-এন্ট্রি অ্যাকাউন্টিং সিস্টেমের কোর লজিক তৈরি করা।

*   **Step 3.1: Chart of Accounts (CoA):** লিমিটেড কোম্পানি, সোল ট্রেডার ইত্যাদির জন্য স্ট্যান্ডার্ড CoA টেমপ্লেট তৈরি করা।
*   **Step 3.2: Double-Entry Ledger:** `Journals` এবং `Ledger Entries` ডেটাবেস টেবিল তৈরি করা, যেন ডেবিট এবং ক্রেডিট সবসময় সমান থাকে।
*   **Step 3.3: Trial Balance Logic:** লেজার এন্ট্রিগুলো ক্যালকুলেট করে রিয়েল-টাইম Trial Balance জেনারেট করার ব্যাকএন্ড লজিক লেখা।

---

## Phase 4: Bookkeeping Module (হিসাবরক্ষণ)
দৈনন্দিন লেনদেনগুলো ম্যানেজ করার সিস্টেম।

*   **Step 4.1: Sales & Receivables:** ইনভয়েস (Invoice), কোটেশন (Quote) তৈরি এবং কাস্টমার ম্যানেজমেন্ট।
*   **Step 4.2: Purchases & Payables:** বিল (Bills), খরচ (Expenses), এবং সাপ্লায়ার ম্যানেজমেন্ট।
*   **Step 4.3: Banking:** ব্যাংক অ্যাকাউন্ট অ্যাড করা, ট্রানজ্যাকশন ম্যানুয়ালি এন্ট্রি করা এবং ব্যাংক রিকনসিলিয়েশন (Bank Reconciliation)।
*   **Step 4.4: VAT Calculator:** Sales এবং Purchases ডেটা থেকে স্বয়ংক্রিয়ভাবে VAT রিটার্ন হিসাব করার লজিক (MTD এর জন্য প্রস্তুত করা)।

---

## Phase 5: Payroll & HR Module (বেতন ও মানবসম্পদ)
কর্মচারীদের বেতন এবং ট্যাক্স হিসাব করা।

*   **Step 5.1: Employee Directory:** কর্মচারীদের ডেটা, ট্যাক্স কোড, এবং ন্যাশনাল ইন্সুরেন্স (NI) নম্বর স্টোর করা।
*   **Step 5.2: Pay Runs:** সাপ্তাহিক বা মাসিক পে-রোল প্রসেস করা (Gross Pay, Tax Deductions, Net Pay)।
*   **Step 5.3: Payslips:** অটোমেটিক পে-স্লিপ (PDF) জেনারেট করে ইমেইল করার সিস্টেম।
*   **Step 5.4: HMRC RTI Integration:** FPS (Full Payment Submission) এবং EPS এর জন্য XML জেনারেট করা।

---

## Phase 6: Tax & Compliance (ট্যাক্স এবং রিটার্ন)
বছর শেষের চূড়ান্ত রিপোর্ট এবং ট্যাক্স ফাইলিং।

*   **Step 6.1: Accounts Production:** Trial Balance এর ডেটা ব্যবহার করে ফিন্যান্সিয়াল স্টেটমেন্ট (P&L, Balance Sheet, Directors Report) অটো-জেনারেট করা।
*   **Step 6.2: Corporation Tax (CT600):** কোম্পানির লাভ-ক্ষতি হিসাব করে কর্পোরেশন ট্যাক্স ক্যালকুলেট করা এবং CT600 ফর্ম পূরণ করা।
*   **Step 6.3: Self Assessment (SA100):** ব্যক্তিগত ট্যাক্স রিটার্ন এবং পার্টনারশিপ ট্যাক্স ক্যালকুলেশন।

---

## Phase 7: Practice Management & CRM (ফার্ম পরিচালনা)
অ্যাকাউন্টিং ফার্ম তাদের নিজেদের অফিস এবং ক্লায়েন্ট কিভাবে ম্যানেজ করবে।

*   **Step 7.1: Workspace & Tasks:** স্টাফদের মধ্যে কাজ (Tasks/Jobs) ভাগ করে দেয়া এবং ট্র্যাকিং করা (Kanban Board)।
*   **Step 7.2: Deadlines Tracker:** ক্লায়েন্টদের ট্যাক্স ফাইলিং এবং পেমেন্টের ডেডলাইন মনিটর করা।
*   **Step 7.3: Timesheets & Billing:** স্টাফদের কাজের সময় ট্র্যাক করা এবং সে অনুযায়ী ক্লায়েন্টকে বিল করা।
*   **Step 7.4: CRM & Onboarding:** নতুন ক্লায়েন্ট কানেকশন, প্রপোজাল পাঠানো এবং AML (Anti-Money Laundering) চেক।

---

## Phase 8: Addons & Integrations (অতিরিক্ত ফিচার)
সিস্টেমকে আরও প্রফেশনাল এবং স্বয়ংসম্পূর্ণ করা।

*   **Step 8.1: Client Portal:** ক্লায়েন্টদের জন্য একটি সেপারেট পোর্টাল তৈরি করা যেখানে তারা ডকুমেন্টস আপলোড করতে পারবে।
*   **Step 8.2: E-Signature (e.g., Capisign):** ট্যাক্স রিটার্ন বা প্রপোজাল পিডিএফ-এ ডিজিটাল সিগনেচার নেয়ার সিস্টেম।
*   **Step 8.3: HMRC Gateway API:** MTD (Making Tax Digital) এর জন্য ডিরেক্ট HMRC এর API-তে ডেটা পুশ করার সিস্টেম তৈরি করা। 
*   **Step 8.4: System Polish:** Redis ব্যবহার করে ড্যাশবোর্ডগুলো ক্যাশ (Cache) করা এবং সিকিউরিটি অডিট করা।
