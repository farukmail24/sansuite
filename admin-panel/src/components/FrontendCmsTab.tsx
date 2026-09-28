import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch } from '../App'
import toast from 'react-hot-toast'
import {
  Globe, Layout, Sparkles, Layers, CreditCard, MessageSquareQuote,
  HelpCircle, UserCheck, Plus, Trash2, Edit3, Save, ExternalLink,
  CheckCircle2, X, RefreshCw, Eye, ShieldCheck, Mail, Phone, MapPin,
  Building2, ChevronRight, Search, FileText, Star, Clock, Check,
  AlertCircle, ArrowRight, Laptop, Sliders, ChevronDown
} from 'lucide-react'

export type CmsPageTab =
  | 'home'         // Homepage (/) - Hero, TrustBar, Modules Showcase, ROI Calculator, Testimonials, CTA
  | 'pricing'      // Pricing (/pricing) - Tiers, Annual Discount, 15-Feature Matrix, FAQs
  | 'solutions'    // Solutions Deep-Dives (/solutions/:slug) - 10 Modules, 4-step statutory workflows, feature bullets, Capium comparison
  | 'book-demo'    // Book Demo (/book-demo) - Value cards, client brackets, guarantee copy
  | 'contact'      // Contact Us (/contact) - Canary Wharf HQ, Phones, Saturday filing hours, inboxes
  | 'global'       // Global Layout - Header announcement banner, Site SEO & Identity, Footer & Legal
  | 'leads'        // Inbound Leads & Demo CRM pipeline

const DEFAULT_PAGE_CONFIG = {
  visibility: {
    homeHero: true,
    homeTrustBar: true,
    homeModules: true,
    homeRoi: true,
    homeTestimonials: true,
    homeCta: true,
    pricingTiers: true,
    pricingComparison: true,
    pricingFaqs: true,
    bookDemoBenefits: true,
    contactMap: true,
    contactHotlines: true,
  },
  trustBar: {
    eyebrow: "Enterprise Security & UK Statutory Compliance",
    heading: "Trusted by UK Chartered Accountants, CPAs, and Independent Accounting Practices",
    badges: [
      { title: "HMRC Recognized", subtitle: "MTD VAT, MTD IT, CT600 & RTI", badge: "Direct Digital Gateway", iconName: "Award" },
      { title: "Companies House", subtitle: "Direct electronic iXBRL filings", badge: "One-Click Submission", iconName: "Building2" },
      { title: "ICAEW & ACCA Standard", subtitle: "FRS 102 (1A) & FRS 105 compliant", badge: "Statutory Taxonomies", iconName: "CheckCircle2" },
      { title: "Bank-Grade Encryption", subtitle: "AES-256 data security at rest", badge: "UK Data Residency", iconName: "Lock" },
      { title: "99.99% Cloud Uptime", subtitle: "ISO 27001 certified data centers", badge: "Auto-Failover SLA", iconName: "Cloud" }
    ]
  },
  roiCalculator: {
    eyebrow: "Interactive Practice Efficiency Calculator",
    heading: "See How Much Time & Cost SanSuite Saves Your Firm",
    subtitle: "Unlike legacy software providers who charge exorbitant per-seat license fees, SanSuite includes unlimited staff users and unified data flow across all compliance workflows.",
    defaultClients: 100,
    defaultTeam: 4,
    hoursPerClientMultiplier: 3.6,
    legacySeatCost: 65,
    legacyClientCost: 2.2
  },
  pricingMatrix: [
    { feature: "Unlimited Staff Users & Interns", starter: true, growth: true, enterprise: true },
    { feature: "Practice Management & CRM", starter: true, growth: true, enterprise: true },
    { feature: "AML & Risk Assessment Verification", starter: true, growth: true, enterprise: true },
    { feature: "Accounts Production (FRS 102 1A / 105)", starter: true, growth: true, enterprise: true },
    { feature: "Corporation Tax (CT600) Direct Filing", starter: true, growth: true, enterprise: true },
    { feature: "Bookkeeping & MTD for VAT Gateway", starter: true, growth: true, enterprise: true },
    { feature: "Unlimited SanSuite eSignatures (eIDAS)", starter: true, growth: true, enterprise: true },
    { feature: "Self Assessment (SA100, SA800, SA900)", starter: false, growth: true, enterprise: true },
    { feature: "Payroll & RTI Auto-Enrolment Pensions", starter: false, growth: true, enterprise: true },
    { feature: "Company Secretarial & Formations", starter: false, growth: true, enterprise: true },
    { feature: "Making Tax Digital for Income Tax (MTD IT)", starter: false, growth: true, enterprise: true },
    { feature: "Client Portal 365 SME Mobile Hub", starter: false, growth: true, enterprise: true },
    { feature: "Priority UK Phone & Remote Desktop Support", starter: false, growth: true, enterprise: true },
    { feature: "Full White-Label & Custom Subdomain", starter: false, growth: false, enterprise: true },
    { feature: "Dedicated UK Customer Success Manager", starter: false, growth: false, enterprise: true }
  ],
  bookDemo: {
    heading: "Experience the Power of Unified Practice Cloud",
    subtitle: "Book a customized 1-on-1 walkthrough with a UK accounting technology specialist.",
    guarantee: "No obligation. No credit card required. 30-minute tailored walkthrough.",
    benefits: [
      { title: "Tailored to Your Practice Size", description: "Whether you manage 20 or 2,000 clients, see workflows tuned to your exact operational scale." },
      { title: "Live Direct Filing Gateway Demos", description: "Watch real-time live submission simulations for HMRC (VAT, CT600, RTI) and Companies House." },
      { title: "Free Zero-Downtime Data Migration", description: "Learn how our UK team transfers client records, balances, and contacts from your legacy software." },
      { title: "Zero Lock-In & Unlimited Staff", description: "Get transparent quote with unlimited users, unlimited eSign, and no per-seat penalty fees." }
    ],
    brackets: ["1 - 20 Clients", "20 - 50 Clients", "50 - 150 Clients", "150 - 500 Clients", "500+ Clients"]
  },
  contactInfo: {
    officeName: "London Headquarters",
    address: "1 Canada Square, Canary Wharf, London, E14 5AA, United Kingdom",
    companyReg: "Registered in England & Wales No. 12345678",
    vatReg: "VAT Registration No. GB 987 6543 21",
    supportPhone: "+44 (0) 20 8000 0000",
    salesPhone: "+44 (0) 20 8000 0001",
    weekdayHours: "Monday - Friday: 08:30 - 18:00 GMT",
    saturdayHours: "Saturday (Filing Deadline Months): 09:00 - 14:00 GMT",
    generalEmail: "contact@sansuite.co.uk",
    salesEmail: "sales@sansuite.co.uk",
    supportEmail: "support@sansuite.co.uk",
    complianceEmail: "compliance@sansuite.co.uk"
  },
  homeCta: {
    heading: "Ready to modernise your accountancy practice?",
    subtitle: "Join hundreds of UK firms eliminating disconnected software silos with SanSuite unified cloud suite.",
    buttonText: "Book a 1-on-1 Practice Demo",
    buttonUrl: "/book-demo"
  }
}

export default function FrontendCmsTab() {
  const [activePage, setActivePage] = useState<CmsPageTab>('home')
  const qc = useQueryClient()

  // Selected solution module for deep-dive page
  const [selectedSolutionSlug, setSelectedSolutionSlug] = useState<string>('practice-management')

  // Modals state
  const [editingModule, setEditingModule] = useState<any | null>(null)
  const [editingPlan, setEditingPlan] = useState<any | null>(null)
  const [editingTestimonial, setEditingTestimonial] = useState<any | null>(null)
  const [editingFaq, setEditingFaq] = useState<any | null>(null)
  const [viewingLead, setViewingLead] = useState<any | null>(null)
  
  // Leads filters
  const [leadSearch, setLeadSearch] = useState('')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [leadTypeFilter, setLeadTypeFilter] = useState('all')

  // 1. Fetch Site Settings
  const { data: settings = {}, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['cms-settings'],
    queryFn: () => saFetch('/api/system-admin/cms/site-settings').then(r => r.json()),
  })

  // 2. Fetch Hero Slide
  const { data: hero = {}, isLoading: isLoadingHero } = useQuery({
    queryKey: ['cms-hero'],
    queryFn: () => saFetch('/api/system-admin/cms/hero').then(r => r.json()),
  })

  // 3. Fetch Modules
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['cms-modules'],
    queryFn: () => saFetch('/api/system-admin/cms/modules').then(r => r.json()),
  })

  // 4. Fetch Pricing Plans
  const { data: pricingPlans = [], isLoading: isLoadingPricing } = useQuery({
    queryKey: ['cms-pricing'],
    queryFn: () => saFetch('/api/system-admin/cms/pricing').then(r => r.json()),
  })

  // 5. Fetch Testimonials
  const { data: testimonials = [], isLoading: isLoadingTestimonials } = useQuery({
    queryKey: ['cms-testimonials'],
    queryFn: () => saFetch('/api/system-admin/cms/testimonials').then(r => r.json()),
  })

  // 6. Fetch FAQs
  const { data: faqs = [], isLoading: isLoadingFaqs } = useQuery({
    queryKey: ['cms-faqs'],
    queryFn: () => saFetch('/api/system-admin/cms/faqs').then(r => r.json()),
  })

  // 7. Fetch Leads & Demo Requests
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['cms-leads'],
    queryFn: () => saFetch('/api/system-admin/cms/leads').then(r => r.json()),
  })

  // Parse pageSectionsConfig from settings
  let pageConfig: any = { ...DEFAULT_PAGE_CONFIG }
  try {
    if (settings.pageSectionsConfig) {
      const parsed = typeof settings.pageSectionsConfig === 'string'
        ? JSON.parse(settings.pageSectionsConfig)
        : settings.pageSectionsConfig
      pageConfig = {
        ...DEFAULT_PAGE_CONFIG,
        ...parsed,
        visibility: { ...DEFAULT_PAGE_CONFIG.visibility, ...(parsed.visibility || {}) },
        trustBar: { ...DEFAULT_PAGE_CONFIG.trustBar, ...(parsed.trustBar || {}) },
        roiCalculator: { ...DEFAULT_PAGE_CONFIG.roiCalculator, ...(parsed.roiCalculator || {}) },
        pricingMatrix: parsed.pricingMatrix || DEFAULT_PAGE_CONFIG.pricingMatrix,
        bookDemo: { ...DEFAULT_PAGE_CONFIG.bookDemo, ...(parsed.bookDemo || {}) },
        contactInfo: { ...DEFAULT_PAGE_CONFIG.contactInfo, ...(parsed.contactInfo || {}) },
        homeCta: { ...DEFAULT_PAGE_CONFIG.homeCta, ...(parsed.homeCta || {}) },
      }
    }
  } catch {
    pageConfig = { ...DEFAULT_PAGE_CONFIG }
  }

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await saFetch('/api/system-admin/cms/site-settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update settings')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-settings'] })
      toast.success('Configuration saved successfully')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Helper to save section config
  const updatePageConfig = (partial: any) => {
    const updated = {
      ...pageConfig,
      ...partial,
    }
    saveSettingsMutation.mutate({ pageSectionsConfig: updated })
  }

  // Save Hero Mutation
  const saveHeroMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await saFetch('/api/system-admin/cms/hero', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update hero slide')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-hero'] })
      toast.success('Hero section updated successfully')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Save Module Mutation
  const saveModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const isNew = !data.id
      const url = isNew ? '/api/system-admin/cms/modules' : `/api/system-admin/cms/modules/${data.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await saFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to save module')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-modules'] })
      setEditingModule(null)
      toast.success('Module saved successfully')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete Module Mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await saFetch(`/api/system-admin/cms/modules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete module')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-modules'] })
      toast.success('Module removed')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Save Pricing Plan Mutation
  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const isNew = !data.id
      const url = isNew ? '/api/system-admin/cms/pricing' : `/api/system-admin/cms/pricing/${data.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await saFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to save pricing plan')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-pricing'] })
      setEditingPlan(null)
      toast.success('Pricing plan saved successfully')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete Plan Mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await saFetch(`/api/system-admin/cms/pricing/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete plan')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-pricing'] })
      toast.success('Pricing plan removed')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Save Testimonial Mutation
  const saveTestimonialMutation = useMutation({
    mutationFn: async (data: any) => {
      const isNew = !data.id
      const url = isNew ? '/api/system-admin/cms/testimonials' : `/api/system-admin/cms/testimonials/${data.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await saFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to save testimonial')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-testimonials'] })
      setEditingTestimonial(null)
      toast.success('Testimonial saved')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete Testimonial Mutation
  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await saFetch(`/api/system-admin/cms/testimonials/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete testimonial')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-testimonials'] })
      toast.success('Testimonial deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Save FAQ Mutation
  const saveFaqMutation = useMutation({
    mutationFn: async (data: any) => {
      const isNew = !data.id
      const url = isNew ? '/api/system-admin/cms/faqs' : `/api/system-admin/cms/faqs/${data.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await saFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to save FAQ')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-faqs'] })
      setEditingFaq(null)
      toast.success('FAQ saved')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete FAQ Mutation
  const deleteFaqMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await saFetch(`/api/system-admin/cms/faqs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete FAQ')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-faqs'] })
      toast.success('FAQ deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Update Lead Status Mutation
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await saFetch(`/api/system-admin/cms/leads/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes }),
      })
      if (!res.ok) throw new Error('Failed to update lead status')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-leads'] })
      toast.success('Lead status updated')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete Lead Mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await saFetch(`/api/system-admin/cms/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete lead')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-leads'] })
      toast.success('Lead inquiry deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Filtered Leads
  const filteredLeads = leads.filter((l: any) => {
    const matchesSearch = !leadSearch.trim() || (
      (l.fullName || '').toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.workEmail || '').toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.practiceName || '').toLowerCase().includes(leadSearch.toLowerCase())
    )
    const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter
    const matchesType = leadTypeFilter === 'all' || l.inquiryType === leadTypeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Selected solution module object
  const currentSolutionModule = modules.find((m: any) => m.slug === selectedSolutionSlug) || modules[0] || {}

  // Parse workflow steps of current solution module
  let solutionWorkflowSteps: any[] = []
  try {
    if (currentSolutionModule.workflowSteps) {
      solutionWorkflowSteps = typeof currentSolutionModule.workflowSteps === 'string'
        ? JSON.parse(currentSolutionModule.workflowSteps)
        : currentSolutionModule.workflowSteps
    }
  } catch {
    solutionWorkflowSteps = []
  }

  // Active new leads count
  const newLeadsCount = leads.filter((l: any) => l.status === 'new').length

  return (
    <div className="space-y-6">
      {/* 1. Header with Global Live Website Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-[#6c5ce7] border border-purple-100 dark:border-purple-500/20">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span>Frontend CMS & Marketing Suite</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-[#6c5ce7] dark:bg-purple-500/20 dark:text-purple-300">
                Page-Wise Architecture
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage website pages, statutory trust badges, pricing tiers, solution deep-dives, and inbound demo bookings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:5000/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-500/20"
          >
            <ExternalLink size={14} /> View Public Website
          </a>
        </div>
      </div>

      {/* 2. PAGE-WISE NAVIGATION TAB BAR */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'home', label: 'Home Page', path: '/', icon: Layout },
            { id: 'pricing', label: 'Pricing Page', path: '/pricing', icon: CreditCard, count: pricingPlans.length },
            { id: 'solutions', label: 'Solutions Deep-Dives', path: '/solutions', icon: Layers, count: modules.length },
            { id: 'book-demo', label: 'Book Demo Page', path: '/book-demo', icon: Clock },
            { id: 'contact', label: 'Contact Us Page', path: '/contact', icon: Phone },
            { id: 'global', label: 'Global Layout', path: 'Header & Footer', icon: Globe },
            { id: 'leads', label: 'Leads & Inquiries CRM', path: 'Inbound Pipeline', icon: UserCheck, count: newLeadsCount, badgeColor: 'bg-rose-500' },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activePage === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActivePage(tab.id as CmsPageTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#6c5ce7] text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : (tab.badgeColor ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300')
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. PAGE 1: HOMEPAGE CONTROLLER */}
      {activePage === 'home' && (
        <div className="space-y-6">
          {/* Page Banner Info */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Managing Route:</span>
              <code className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                /
              </code>
              <span className="text-slate-400">• 6 Dynamic Sections</span>
            </div>
            <a
              href="http://localhost:5000/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <span>Preview Live Home Page</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Section 1: Hero Carousel Banner */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 1: Top Hero Banner & Primary CTAs</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                <span>Section Visible</span>
                <input
                  type="checkbox"
                  checked={pageConfig.visibility.homeHero !== false}
                  onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, homeHero: e.target.checked } })}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                saveHeroMutation.mutate({
                  badgeText: fd.get('badgeText'),
                  title: fd.get('title'),
                  highlightWord: fd.get('highlightWord'),
                  subtitle: fd.get('subtitle'),
                  primaryCtaText: fd.get('primaryCtaText'),
                  primaryCtaUrl: fd.get('primaryCtaUrl'),
                  secondaryCtaText: fd.get('secondaryCtaText'),
                  secondaryCtaUrl: fd.get('secondaryCtaUrl'),
                  ratingScore: fd.get('ratingScore'),
                  ratingCount: parseInt(fd.get('ratingCount') as string, 10) || 1250,
                })
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
            >
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Top Badge Label</label>
                <input
                  name="badgeText"
                  defaultValue={hero.badgeText || "HMRC & Companies House Recognized"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Headline Title</label>
                <input
                  name="title"
                  defaultValue={hero.title || "The Unified Cloud Operating System for Modern UK Accounting Practices"}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Gradient Highlighted Word</label>
                <input
                  name="highlightWord"
                  defaultValue={hero.highlightWord || "Unified Cloud Operating System"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle Narrative</label>
                <textarea
                  name="subtitle"
                  rows={3}
                  defaultValue={hero.subtitle || "Say goodbye to fragmented desktop tools. SanSuite unifies Practice Management, FRS 102/105 Accounts Production, CT600 Corporation Tax, SA100, MTD VAT, RTI Payroll, CoSec, and Unlimited eSign into a single high-speed cloud platform."}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary CTA Button Text</label>
                <input
                  name="primaryCtaText"
                  defaultValue={hero.primaryCtaText || "Book a 1-on-1 Practice Demo"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary CTA Destination URL</label>
                <input
                  name="primaryCtaUrl"
                  defaultValue={hero.primaryCtaUrl || "/book-demo"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Social Proof Rating Score</label>
                <input
                  name="ratingScore"
                  defaultValue={hero.ratingScore || "4.9"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Verified Review Count</label>
                <input
                  name="ratingCount"
                  type="number"
                  defaultValue={hero.ratingCount || 1420}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saveHeroMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveHeroMutation.isPending ? 'Saving...' : 'Save Hero Banner'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Statutory Trust Bar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 2: Statutory Trust & Accreditations Bar</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                <span>Section Visible</span>
                <input
                  type="checkbox"
                  checked={pageConfig.visibility.homeTrustBar !== false}
                  onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, homeTrustBar: e.target.checked } })}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                updatePageConfig({
                  trustBar: {
                    ...pageConfig.trustBar,
                    eyebrow: fd.get('trustEyebrow'),
                    heading: fd.get('trustHeading'),
                  }
                })
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Eyebrow Tag</label>
                  <input
                    name="trustEyebrow"
                    defaultValue={pageConfig.trustBar?.eyebrow || "Enterprise Security & UK Statutory Compliance"}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Headline Statement</label>
                  <input
                    name="trustHeading"
                    defaultValue={pageConfig.trustBar?.heading || "Trusted by UK Chartered Accountants, CPAs, and Independent Accounting Practices"}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              {/* 5 Accreditations Display */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">Configured Accreditations (5 UK Gateways)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {(pageConfig.trustBar?.badges || []).map((b: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block">{b.badge}</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{b.title}</h4>
                      <p className="text-[10px] text-slate-500 leading-tight">{b.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Trust Bar Config'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: 10 Modules Showcase */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 3: 10 Core UK Accounting Modules Showcase</h3>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                  <span>Section Visible</span>
                  <input
                    type="checkbox"
                    checked={pageConfig.visibility.homeModules !== false}
                    onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, homeModules: e.target.checked } })}
                    className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                  />
                </label>
                <button
                  onClick={() => setEditingModule({
                    title: '',
                    slug: '',
                    category: 'Core Compliance',
                    shortDescription: '',
                    detailedDescription: '',
                    badgeTag: 'HMRC Direct',
                    sortOrder: modules.length + 1,
                    isFeatured: true,
                    isActive: true,
                    bulletPoints: [''],
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#6c5ce7] border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  <Plus size={14} /> Add Module
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((m: any) => (
                <div
                  key={m.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-[#6c5ce7] dark:text-purple-300">
                        {m.category || 'Compliance'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">#{m.sortOrder}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{m.shortDescription}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setSelectedSolutionSlug(m.slug)
                        setActivePage('solutions')
                      }}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Deep Dive</span>
                      <ArrowRight size={12} />
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingModule(m)}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Edit Module Card"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${m.title}?`)) {
                            deleteModuleMutation.mutate(m.id)
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Module"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Practice ROI & Efficiency Calculator */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 4: Practice ROI & Efficiency Calculator Settings</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                <span>Section Visible</span>
                <input
                  type="checkbox"
                  checked={pageConfig.visibility.homeRoi !== false}
                  onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, homeRoi: e.target.checked } })}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                updatePageConfig({
                  roiCalculator: {
                    ...pageConfig.roiCalculator,
                    eyebrow: fd.get('roiEyebrow'),
                    heading: fd.get('roiHeading'),
                    subtitle: fd.get('roiSubtitle'),
                    defaultClients: parseInt(fd.get('defaultClients') as string, 10) || 100,
                    defaultTeam: parseInt(fd.get('defaultTeam') as string, 10) || 4,
                    hoursPerClientMultiplier: parseFloat(fd.get('hoursMultiplier') as string) || 3.6,
                    legacySeatCost: parseFloat(fd.get('legacySeatCost') as string) || 65,
                    legacyClientCost: parseFloat(fd.get('legacyClientCost') as string) || 2.2,
                  }
                })
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs"
            >
              <div className="lg:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Calculator Heading</label>
                <input
                  name="roiHeading"
                  defaultValue={pageConfig.roiCalculator?.heading || "See How Much Time & Cost SanSuite Saves Your Firm"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Calculator Subtitle</label>
                <textarea
                  name="roiSubtitle"
                  rows={2}
                  defaultValue={pageConfig.roiCalculator?.subtitle || "Unlike legacy software providers who charge exorbitant per-seat license fees, SanSuite includes unlimited staff users and unified data flow across all compliance workflows."}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Client Slider Value</label>
                <input
                  type="number"
                  name="defaultClients"
                  defaultValue={pageConfig.roiCalculator?.defaultClients || 100}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Team Size Value</label>
                <input
                  type="number"
                  name="defaultTeam"
                  defaultValue={pageConfig.roiCalculator?.defaultTeam || 4}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hours Saved / Client / Year</label>
                <input
                  type="number"
                  step="0.1"
                  name="hoursMultiplier"
                  defaultValue={pageConfig.roiCalculator?.hoursPerClientMultiplier || 3.6}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Legacy Cost / Seat / Mo (£)</label>
                <input
                  type="number"
                  name="legacySeatCost"
                  defaultValue={pageConfig.roiCalculator?.legacySeatCost || 65}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Legacy Cost / Client / Mo (£)</label>
                <input
                  type="number"
                  step="0.1"
                  name="legacyClientCost"
                  defaultValue={pageConfig.roiCalculator?.legacyClientCost || 2.2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="lg:col-span-3 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Calculator Formula'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 5: Customer Testimonials */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquareQuote size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 5: Customer Testimonials & Reviews</h3>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                  <span>Section Visible</span>
                  <input
                    type="checkbox"
                    checked={pageConfig.visibility.homeTestimonials !== false}
                    onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, homeTestimonials: e.target.checked } })}
                    className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                  />
                </label>
                <button
                  onClick={() => setEditingTestimonial({
                    clientName: '',
                    clientRole: 'Managing Partner',
                    practiceName: '',
                    practiceLocation: 'London, UK',
                    rating: 5,
                    reviewText: '',
                    verifiedClient: true,
                    sortOrder: testimonials.length + 1,
                    isActive: true,
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#6c5ce7] border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  <Plus size={14} /> Add Testimonial
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t: any) => (
                <div
                  key={t.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                          <Star key={i} size={12} className="fill-amber-400" />
                        ))}
                      </div>
                      {t.verifiedClient && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                          Verified Partner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3">"{t.reviewText}"</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{t.clientName}</h4>
                      <span className="text-[10px] text-slate-500">{t.practiceName} • {t.practiceLocation}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTestimonial(t)}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete testimonial from ${t.clientName}?`)) {
                            deleteTestimonialMutation.mutate(t.id)
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Bottom Conversion CTA */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRight size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 6: Bottom Conversion CTA Banner</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                <span>Section Visible</span>
                <input
                  type="checkbox"
                  checked={pageConfig.visibility.homeCta !== false}
                  onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, homeCta: e.target.checked } })}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                updatePageConfig({
                  homeCta: {
                    heading: fd.get('ctaHeading'),
                    subtitle: fd.get('ctaSubtitle'),
                    buttonText: fd.get('ctaButtonText'),
                    buttonUrl: fd.get('ctaButtonUrl'),
                  }
                })
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Headline Copy</label>
                <input
                  name="ctaHeading"
                  defaultValue={pageConfig.homeCta?.heading || "Ready to modernise your accountancy practice?"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Button Text</label>
                <input
                  name="ctaButtonText"
                  defaultValue={pageConfig.homeCta?.buttonText || "Book a 1-on-1 Practice Demo"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supporting Copy</label>
                <input
                  name="ctaSubtitle"
                  defaultValue={pageConfig.homeCta?.subtitle || "Join hundreds of UK firms eliminating disconnected software silos with SanSuite unified cloud suite."}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save CTA Banner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. PAGE 2: PRICING PAGE CONTROLLER */}
      {activePage === 'pricing' && (
        <div className="space-y-6">
          {/* Page Banner Info */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Managing Route:</span>
              <code className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                /pricing
              </code>
              <span className="text-slate-400">• 4 Dynamic Sections</span>
            </div>
            <a
              href="http://localhost:5000/pricing"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <span>Preview Live Pricing Page</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Section 1: Pricing Tiers */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 1: Subscription Tier Plans (Starter, Growth, Enterprise)</h3>
              </div>
              <button
                onClick={() => setEditingPlan({
                  planName: '',
                  targetAudience: 'For Sole Practitioners & Small Practices',
                  monthlyPrice: '99.00',
                  annualPriceMonthlyBilled: '85.00',
                  currency: 'GBP',
                  clientLimit: 'Up to 50 Clients',
                  userLimit: 'Unlimited Users',
                  popularBadge: false,
                  ctaLabel: 'Book Free Trial',
                  ctaUrl: '/book-demo',
                  sortOrder: pricingPlans.length + 1,
                  isActive: true,
                  featuresList: ['Unlimited Staff Users', 'Practice Management & CRM'],
                })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#6c5ce7] border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
              >
                <Plus size={14} /> Add Plan Tier
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((p: any) => {
                let feats: string[] = []
                try {
                  feats = Array.isArray(p.featuresList) ? p.featuresList : JSON.parse(p.featuresList || '[]')
                } catch {
                  feats = []
                }
                return (
                  <div
                    key={p.id}
                    className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 ${
                      p.popularBadge
                        ? 'border-purple-400 dark:border-purple-600 bg-purple-50/20 dark:bg-purple-950/20 shadow-lg'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{p.planName}</h4>
                        {p.popularBadge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6c5ce7] text-white">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{p.targetAudience}</p>

                      <div className="pt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900 dark:text-white">£{p.monthlyPrice}</span>
                          <span className="text-xs text-slate-500 font-medium">/month</span>
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                          £{p.annualPriceMonthlyBilled}/mo billed annually (Save 15%)
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.clientLimit} • {p.userLimit}</span>
                        {feats.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            <span className="line-clamp-1">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingPlan(p)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete plan ${p.planName}?`)) {
                            deletePlanMutation.mutate(p.id)
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: 15-Feature Comparison Matrix */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 2: 15-Feature Comparison Matrix Manager</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-600 dark:text-slate-400">
                <span>Matrix Visible</span>
                <input
                  type="checkbox"
                  checked={pageConfig.visibility.pricingComparison !== false}
                  onChange={(e) => updatePageConfig({ visibility: { ...pageConfig.visibility, pricingComparison: e.target.checked } })}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Control the feature inclusion checkmarks across Starter, Growth, and Enterprise packages shown on the public pricing page.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Platform Capability / Statutory Feature</th>
                    <th className="p-3 text-center w-28">Starter Suite</th>
                    <th className="p-3 text-center w-28">Growth Practice</th>
                    <th className="p-3 text-center w-28">Enterprise Suite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageConfig.pricingMatrix.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {row.feature}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.starter}
                          onChange={(e) => {
                            const newMatrix = [...pageConfig.pricingMatrix]
                            newMatrix[idx] = { ...newMatrix[idx], starter: e.target.checked }
                            updatePageConfig({ pricingMatrix: newMatrix })
                          }}
                          className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.growth}
                          onChange={(e) => {
                            const newMatrix = [...pageConfig.pricingMatrix]
                            newMatrix[idx] = { ...newMatrix[idx], growth: e.target.checked }
                            updatePageConfig({ pricingMatrix: newMatrix })
                          }}
                          className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.enterprise}
                          onChange={(e) => {
                            const newMatrix = [...pageConfig.pricingMatrix]
                            newMatrix[idx] = { ...newMatrix[idx], enterprise: e.target.checked }
                            updatePageConfig({ pricingMatrix: newMatrix })
                          }}
                          className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Pricing FAQs */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-[#6c5ce7]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Section 3: Pricing & Migration FAQs</h3>
              </div>
              <button
                onClick={() => setEditingFaq({
                  category: 'Pricing',
                  question: '',
                  answer: '',
                  sortOrder: faqs.length + 1,
                  isActive: true,
                })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#6c5ce7] border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
              >
                <Plus size={14} /> Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((f: any) => (
                <div
                  key={f.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {f.category || 'General'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{f.question}</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.answer}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingFaq(f)}
                      className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete FAQ?')) {
                          deleteFaqMutation.mutate(f.id)
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. PAGE 3: SOLUTIONS DEEP-DIVES CONTROLLER */}
      {activePage === 'solutions' && (
        <div className="space-y-6">
          {/* Module Selector Pill Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Select UK Accounting Module to Edit:</span>
              <a
                href={`http://localhost:5000/solutions/${selectedSolutionSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <span>Preview /solutions/{selectedSolutionSlug}</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {modules.map((m: any) => {
                const isSelected = selectedSolutionSlug === m.slug
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedSolutionSlug(m.slug)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#6c5ce7] text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {m.title}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Module Detailed Content & 4-Step Statutory Workflow Editor */}
          {currentSolutionModule.id ? (
            <form
              key={currentSolutionModule.id}
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)

                // Gather 4 workflow steps
                const steps = [
                  { step: 1, title: fd.get('step1_title'), description: fd.get('step1_desc') },
                  { step: 2, title: fd.get('step2_title'), description: fd.get('step2_desc') },
                  { step: 3, title: fd.get('step3_title'), description: fd.get('step3_desc') },
                  { step: 4, title: fd.get('step4_title'), description: fd.get('step4_desc') },
                ]

                saveModuleMutation.mutate({
                  id: currentSolutionModule.id,
                  title: fd.get('title'),
                  slug: fd.get('slug'),
                  category: fd.get('category'),
                  badgeTag: fd.get('badgeTag'),
                  shortDescription: fd.get('shortDescription'),
                  detailedDescription: fd.get('detailedDescription'),
                  capiumComparisonHighlight: fd.get('capiumComparisonHighlight'),
                  workflowSteps: steps,
                  sortOrder: parseInt(fd.get('sortOrder') as string, 10) || 1,
                  isActive: fd.get('isActive') === 'on',
                })
              }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[#6c5ce7]" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Editing Solution: {currentSolutionModule.title} (/solutions/{currentSolutionModule.slug})
                  </h3>
                </div>
                <button
                  type="submit"
                  disabled={saveModuleMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveModuleMutation.isPending ? 'Saving...' : 'Save Solution'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Module Name</label>
                  <input
                    name="title"
                    defaultValue={currentSolutionModule.title}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Slug</label>
                  <input
                    name="slug"
                    defaultValue={currentSolutionModule.slug}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    name="category"
                    defaultValue={currentSolutionModule.category || 'Core Compliance'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Short Overview (Card summary)</label>
                  <input
                    name="shortDescription"
                    defaultValue={currentSolutionModule.shortDescription}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Detailed Narrative (Full deep-dive description)</label>
                  <textarea
                    name="detailedDescription"
                    rows={4}
                    defaultValue={currentSolutionModule.detailedDescription || currentSolutionModule.shortDescription}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capium Parity & Advantage Highlight
                  </label>
                  <textarea
                    name="capiumComparisonHighlight"
                    rows={2}
                    defaultValue={currentSolutionModule.capiumComparisonHighlight || "100% workflow parity with Capium plus automated deadline synchronization and built-in filing diagnostic validations."}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              {/* 4-Step Statutory Workflow Editor */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  4-Step Statutory Workflow Sequence
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((stepNum) => {
                    const stepObj = solutionWorkflowSteps[stepNum - 1] || {}
                    return (
                      <div key={stepNum} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                          Step 0{stepNum}
                        </span>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Step Title</label>
                          <input
                            name={`step${stepNum}_title`}
                            defaultValue={stepObj.title || `Workflow Step 0${stepNum}`}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Step Description</label>
                          <textarea
                            name={`step${stepNum}_desc`}
                            rows={2}
                            defaultValue={stepObj.desc || stepObj.description || ""}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saveModuleMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveModuleMutation.isPending ? 'Saving...' : 'Save Module & Workflow'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-slate-500">No modules found. Please create one.</div>
          )}
        </div>
      )}

      {/* 6. PAGE 4: BOOK DEMO PAGE CONTROLLER */}
      {activePage === 'book-demo' && (
        <div className="space-y-6">
          {/* Page Banner Info */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Managing Route:</span>
              <code className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                /book-demo
              </code>
            </div>
            <a
              href="http://localhost:5000/book-demo"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <span>Preview Live Demo Page</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock size={16} className="text-[#6c5ce7]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Book Demo Page Left-Panel Value Cards & Copy</h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                updatePageConfig({
                  bookDemo: {
                    ...pageConfig.bookDemo,
                    heading: fd.get('demoHeading'),
                    subtitle: fd.get('demoSubtitle'),
                    guarantee: fd.get('demoGuarantee'),
                  }
                })
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Headline Copy</label>
                <input
                  name="demoHeading"
                  defaultValue={pageConfig.bookDemo?.heading || "Experience the Power of Unified Practice Cloud"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle Narrative</label>
                <textarea
                  name="demoSubtitle"
                  rows={2}
                  defaultValue={pageConfig.bookDemo?.subtitle || "Book a customized 1-on-1 walkthrough with a UK accounting technology specialist."}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Satisfaction Guarantee Statement</label>
                <input
                  name="demoGuarantee"
                  defaultValue={pageConfig.bookDemo?.guarantee || "No obligation. No credit card required. 30-minute tailored walkthrough."}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">Left-Panel Benefit Cards (4 Points)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(pageConfig.bookDemo?.benefits || []).map((b: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>{b.title}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Book Demo Copy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PAGE 5: CONTACT US PAGE CONTROLLER */}
      {activePage === 'contact' && (
        <div className="space-y-6">
          {/* Page Banner Info */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Managing Route:</span>
              <code className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                /contact
              </code>
            </div>
            <a
              href="http://localhost:5000/contact"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <span>Preview Live Contact Page</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Phone size={16} className="text-[#6c5ce7]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">UK Headquarters, Telephone Hotlines & Department Inboxes</h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)

                // Save both top-level settings and pageConfig.contactInfo
                saveSettingsMutation.mutate({
                  officeAddress: fd.get('officeAddress'),
                  contactPhone: fd.get('supportPhone'),
                  contactEmail: fd.get('generalEmail'),
                  companyRegNumber: fd.get('companyReg'),
                  vatNumber: fd.get('vatReg'),
                  pageSectionsConfig: {
                    ...pageConfig,
                    contactInfo: {
                      officeName: "London Headquarters",
                      address: fd.get('officeAddress'),
                      companyReg: fd.get('companyReg'),
                      vatReg: fd.get('vatReg'),
                      supportPhone: fd.get('supportPhone'),
                      salesPhone: fd.get('salesPhone'),
                      weekdayHours: fd.get('weekdayHours'),
                      saturdayHours: fd.get('saturdayHours'),
                      generalEmail: fd.get('generalEmail'),
                      salesEmail: fd.get('salesEmail'),
                      supportEmail: fd.get('supportEmail'),
                      complianceEmail: fd.get('complianceEmail'),
                    }
                  }
                })
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
            >
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">London Headquarters Address</label>
                <input
                  name="officeAddress"
                  defaultValue={settings.officeAddress || pageConfig.contactInfo?.address || "1 Canada Square, Canary Wharf, London, E14 5AA, United Kingdom"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Support Telephone Hotline</label>
                <input
                  name="supportPhone"
                  defaultValue={settings.contactPhone || pageConfig.contactInfo?.supportPhone || "+44 (0) 20 8000 0000"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Advisory Phone</label>
                <input
                  name="salesPhone"
                  defaultValue={pageConfig.contactInfo?.salesPhone || "+44 (0) 20 8000 0001"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Weekday Operating Hours</label>
                <input
                  name="weekdayHours"
                  defaultValue={pageConfig.contactInfo?.weekdayHours || "Monday - Friday: 08:30 - 18:00 GMT"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Saturday Filing Deadline Hours</label>
                <input
                  name="saturdayHours"
                  defaultValue={pageConfig.contactInfo?.saturdayHours || "Saturday (Filing Deadline Months): 09:00 - 14:00 GMT"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">General Inbox Email</label>
                <input
                  name="generalEmail"
                  defaultValue={settings.contactEmail || "contact@sansuite.co.uk"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Department Email</label>
                <input
                  name="salesEmail"
                  defaultValue={pageConfig.contactInfo?.salesEmail || "sales@sansuite.co.uk"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tech Support Email</label>
                <input
                  name="supportEmail"
                  defaultValue={pageConfig.contactInfo?.supportEmail || "support@sansuite.co.uk"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Compliance & Legal Email</label>
                <input
                  name="complianceEmail"
                  defaultValue={pageConfig.contactInfo?.complianceEmail || "compliance@sansuite.co.uk"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Contact Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. PAGE 6: GLOBAL HEADER & FOOTER */}
      {activePage === 'global' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Globe size={16} className="text-[#6c5ce7]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Global Announcement Bar & Site SEO Defaults</h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                saveSettingsMutation.mutate({
                  siteName: fd.get('siteName'),
                  siteTagline: fd.get('siteTagline'),
                  companyRegNumber: fd.get('companyRegNumber'),
                  vatNumber: fd.get('vatNumber'),
                  headerAnnouncementText: fd.get('headerAnnouncementText'),
                  headerAnnouncementLink: fd.get('headerAnnouncementLink'),
                  headerAnnouncementActive: fd.get('headerAnnouncementActive') === 'on',
                  seoMetaTitle: fd.get('seoMetaTitle'),
                  seoMetaDescription: fd.get('seoMetaDescription'),
                })
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
            >
              <div className="md:col-span-2 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#6c5ce7] dark:text-purple-300">Top Header Announcement Bar</span>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                    <span>Show Announcement</span>
                    <input
                      type="checkbox"
                      name="headerAnnouncementActive"
                      defaultChecked={settings.headerAnnouncementActive !== false}
                      className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Announcement Copy</label>
                    <input
                      name="headerAnnouncementText"
                      defaultValue={settings.headerAnnouncementText || "HMRC Making Tax Digital for Income Tax (MTD IT) Live & Fully Compliant"}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Target Link URL</label>
                    <input
                      name="headerAnnouncementLink"
                      defaultValue={settings.headerAnnouncementLink || "/solutions/mtd-it"}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand Name</label>
                <input
                  name="siteName"
                  defaultValue={settings.siteName || "SanSuite"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand Tagline</label>
                <input
                  name="siteTagline"
                  defaultValue={settings.siteTagline || "The Unified Cloud Operating System for UK Accounting Practices"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Registration Number</label>
                <input
                  name="companyRegNumber"
                  defaultValue={settings.companyRegNumber || "12345678"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">VAT Registration Number</label>
                <input
                  name="vatNumber"
                  defaultValue={settings.vatNumber || "GB 987 6543 21"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SEO Meta Title</label>
                <input
                  name="seoMetaTitle"
                  defaultValue={settings.seoMetaTitle || "SanSuite - UK Cloud Accounting & Practice Management Software"}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SEO Meta Description</label>
                <textarea
                  name="seoMetaDescription"
                  rows={3}
                  defaultValue={settings.seoMetaDescription || "All-in-one UK accounting, tax, bookkeeping, and practice management software suite for accountants and bookkeepers. HMRC and Companies House compliant."}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  <Save size={14} />
                  <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Global Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. PAGE 7: LEADS & INQUIRIES CRM */}
      {activePage === 'leads' && (
        <div className="space-y-6">
          {/* CRM Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Total Inquiries</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{leads.length}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-[#6c5ce7] flex items-center justify-center">
                <UserCheck size={20} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-500 font-semibold block">New (Uncontacted)</span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">
                  {leads.filter((l: any) => l.status === 'new').length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-500 font-semibold block">Demo Scheduled</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {leads.filter((l: any) => l.status === 'demo_scheduled').length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-500 font-semibold block">Closed / Converted</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {leads.filter((l: any) => l.status === 'closed').length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>

          {/* CRM Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Search leads by name, email, or practice..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#6c5ce7]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="demo_scheduled">Demo Scheduled</option>
                <option value="closed">Closed / Won</option>
              </select>

              <select
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Inquiry Types</option>
                <option value="book_demo">Demo Requests</option>
                <option value="contact">Contact Messages</option>
              </select>
            </div>
          </div>

          {/* Interactive Leads Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            {filteredLeads.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <UserCheck size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Inquiries Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When prospects book a demo or submit a contact inquiry on the public site, they will appear here in real-time.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Prospect Details</th>
                    <th className="p-3">Practice Name</th>
                    <th className="p-3">Client Bracket</th>
                    <th className="p-3">Inquiry Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Received At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{l.fullName}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <a href={`mailto:${l.workEmail}`} className="hover:underline flex items-center gap-1">
                            <Mail size={10} /> {l.workEmail}
                          </a>
                          {l.phoneNumber && (
                            <a href={`tel:${l.phoneNumber}`} className="hover:underline flex items-center gap-1">
                              <Phone size={10} /> {l.phoneNumber}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {l.practiceName || '-'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                          {l.clientCountBracket || '50 - 150'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.inquiryType === 'book_demo'
                            ? 'bg-purple-100 text-[#6c5ce7] dark:bg-purple-500/20 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        }`}>
                          {l.inquiryType === 'book_demo' ? '1-on-1 Demo' : 'General Contact'}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={l.status || 'new'}
                          onChange={(e) => updateLeadStatusMutation.mutate({ id: l.id, status: e.target.value })}
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            l.status === 'new'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : l.status === 'contacted'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : l.status === 'demo_scheduled'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="demo_scheduled">Demo Scheduled</option>
                          <option value="closed">Closed / Won</option>
                        </select>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingLead(l)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            title="View Prospect Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete lead record for ${l.fullName}?`)) {
                                deleteLeadMutation.mutate(l.id)
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded text-slate-400 hover:text-rose-600"
                            title="Delete Lead"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT MODULE CARD */}
      {editingModule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingModule.id ? 'Edit Module Card' : 'Create New Module'}
              </h3>
              <button onClick={() => setEditingModule(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                saveModuleMutation.mutate({
                  ...editingModule,
                  title: fd.get('title'),
                  slug: fd.get('slug'),
                  category: fd.get('category'),
                  badgeTag: fd.get('badgeTag'),
                  shortDescription: fd.get('shortDescription'),
                  sortOrder: parseInt(fd.get('sortOrder') as string, 10) || 1,
                  isActive: fd.get('isActive') === 'on',
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-semibold mb-1">Module Title *</label>
                <input
                  name="title"
                  defaultValue={editingModule.title}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">URL Slug *</label>
                  <input
                    name="slug"
                    defaultValue={editingModule.slug}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <input
                    name="category"
                    defaultValue={editingModule.category || 'Core Compliance'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Badge Tag</label>
                  <input
                    name="badgeTag"
                    defaultValue={editingModule.badgeTag || 'HMRC Direct'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Sort Order</label>
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={editingModule.sortOrder || 1}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Short Description *</label>
                <textarea
                  name="shortDescription"
                  rows={3}
                  defaultValue={editingModule.shortDescription}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  defaultChecked={editingModule.isActive !== false}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4"
                />
                <label htmlFor="isActive" className="font-semibold cursor-pointer">Module is Active & Visible</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveModuleMutation.isPending}
                  className="px-5 py-2 bg-[#6c5ce7] text-white font-bold rounded-xl shadow-md"
                >
                  {saveModuleMutation.isPending ? 'Saving...' : 'Save Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PRICING PLAN */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPlan.id ? 'Edit Pricing Plan' : 'Create Pricing Plan'}
              </h3>
              <button onClick={() => setEditingPlan(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                const featsRaw = (fd.get('featuresList') as string || '').split('\n').map(s => s.trim()).filter(Boolean)

                savePlanMutation.mutate({
                  ...editingPlan,
                  planName: fd.get('planName'),
                  targetAudience: fd.get('targetAudience'),
                  monthlyPrice: fd.get('monthlyPrice'),
                  annualPriceMonthlyBilled: fd.get('annualPriceMonthlyBilled'),
                  clientLimit: fd.get('clientLimit'),
                  userLimit: fd.get('userLimit'),
                  popularBadge: fd.get('popularBadge') === 'on',
                  featuresList: featsRaw,
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-semibold mb-1">Plan Name *</label>
                <input
                  name="planName"
                  defaultValue={editingPlan.planName}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Audience</label>
                <input
                  name="targetAudience"
                  defaultValue={editingPlan.targetAudience}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Monthly Price (£) *</label>
                  <input
                    name="monthlyPrice"
                    defaultValue={editingPlan.monthlyPrice}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Annual Monthly Billed Price (£) *</label>
                  <input
                    name="annualPriceMonthlyBilled"
                    defaultValue={editingPlan.annualPriceMonthlyBilled}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Client Limit Label</label>
                  <input
                    name="clientLimit"
                    defaultValue={editingPlan.clientLimit || 'Up to 50 Clients'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Staff User Limit Label</label>
                  <input
                    name="userLimit"
                    defaultValue={editingPlan.userLimit || 'Unlimited Users'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Features Inclusions (One per line)</label>
                <textarea
                  name="featuresList"
                  rows={4}
                  defaultValue={
                    Array.isArray(editingPlan.featuresList)
                      ? editingPlan.featuresList.join('\n')
                      : (typeof editingPlan.featuresList === 'string' ? JSON.parse(editingPlan.featuresList || '[]').join('\n') : '')
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="popularBadge"
                  id="popularBadge"
                  defaultChecked={editingPlan.popularBadge}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4"
                />
                <label htmlFor="popularBadge" className="font-semibold cursor-pointer">Mark as "Most Popular" Plan</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savePlanMutation.isPending}
                  className="px-5 py-2 bg-[#6c5ce7] text-white font-bold rounded-xl shadow-md"
                >
                  {savePlanMutation.isPending ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT TESTIMONIAL */}
      {editingTestimonial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTestimonial.id ? 'Edit Testimonial' : 'Add Testimonial'}
              </h3>
              <button onClick={() => setEditingTestimonial(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                saveTestimonialMutation.mutate({
                  ...editingTestimonial,
                  clientName: fd.get('clientName'),
                  clientRole: fd.get('clientRole'),
                  practiceName: fd.get('practiceName'),
                  practiceLocation: fd.get('practiceLocation'),
                  rating: parseInt(fd.get('rating') as string, 10) || 5,
                  reviewText: fd.get('reviewText'),
                  verifiedClient: fd.get('verifiedClient') === 'on',
                })
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Author Name *</label>
                  <input
                    name="clientName"
                    defaultValue={editingTestimonial.clientName}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Author Role</label>
                  <input
                    name="clientRole"
                    defaultValue={editingTestimonial.clientRole || 'Managing Partner'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Practice Firm Name *</label>
                  <input
                    name="practiceName"
                    defaultValue={editingTestimonial.practiceName}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Location</label>
                  <input
                    name="practiceLocation"
                    defaultValue={editingTestimonial.practiceLocation || 'London, UK'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Star Rating (1 - 5)</label>
                <select
                  name="rating"
                  defaultValue={editingTestimonial.rating || 5}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                >
                  <option value={5}>5 Stars (Exceptional)</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Review Quote *</label>
                <textarea
                  name="reviewText"
                  rows={3}
                  defaultValue={editingTestimonial.reviewText}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="verifiedClient"
                  id="verifiedClient"
                  defaultChecked={editingTestimonial.verifiedClient}
                  className="rounded text-[#6c5ce7] focus:ring-[#6c5ce7] w-4 h-4"
                />
                <label htmlFor="verifiedClient" className="font-semibold cursor-pointer">Show "Verified Client" Badge</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTestimonial(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTestimonialMutation.isPending}
                  className="px-5 py-2 bg-[#6c5ce7] text-white font-bold rounded-xl shadow-md"
                >
                  {saveTestimonialMutation.isPending ? 'Saving...' : 'Save Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT FAQ */}
      {editingFaq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingFaq.id ? 'Edit FAQ' : 'Add FAQ'}
              </h3>
              <button onClick={() => setEditingFaq(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                saveFaqMutation.mutate({
                  ...editingFaq,
                  category: fd.get('category'),
                  question: fd.get('question'),
                  answer: fd.get('answer'),
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <input
                  name="category"
                  defaultValue={editingFaq.category || 'Pricing'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Question *</label>
                <input
                  name="question"
                  defaultValue={editingFaq.question}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Answer *</label>
                <textarea
                  name="answer"
                  rows={4}
                  defaultValue={editingFaq.answer}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFaq(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveFaqMutation.isPending}
                  className="px-5 py-2 bg-[#6c5ce7] text-white font-bold rounded-xl shadow-md"
                >
                  {saveFaqMutation.isPending ? 'Saving...' : 'Save FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW LEAD DETAILS */}
      {viewingLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{viewingLead.fullName}</h3>
                <span className="text-[11px] text-slate-500">{viewingLead.practiceName || 'Independent Practice'}</span>
              </div>
              <button onClick={() => setViewingLead(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Work Email:</span>
                  <a href={`mailto:${viewingLead.workEmail}`} className="font-semibold text-purple-600 hover:underline">
                    {viewingLead.workEmail}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Phone:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {viewingLead.phoneNumber || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Client Bracket:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {viewingLead.clientCountBracket} Clients
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Inquiry Type:</span>
                  <span className="font-semibold text-[#6c5ce7]">
                    {viewingLead.inquiryType === 'book_demo' ? '1-on-1 Demo' : 'Contact Message'}
                  </span>
                </div>
              </div>

              {viewingLead.message && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Message / Requirements:</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                    {viewingLead.message}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Internal Practice Notes:</label>
                <textarea
                  id="leadNotes"
                  rows={3}
                  defaultValue={viewingLead.notes || ''}
                  placeholder="Record call notes, demo date, or lead status..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <select
                value={viewingLead.status || 'new'}
                onChange={(e) => {
                  updateLeadStatusMutation.mutate({ id: viewingLead.id, status: e.target.value })
                  setViewingLead({ ...viewingLead, status: e.target.value })
                }}
                className="p-2 border rounded-xl font-bold text-xs"
              >
                <option value="new">Status: New</option>
                <option value="contacted">Status: Contacted</option>
                <option value="demo_scheduled">Status: Demo Scheduled</option>
                <option value="closed">Status: Closed / Won</option>
              </select>

              <button
                onClick={() => {
                  const notesVal = (document.getElementById('leadNotes') as HTMLTextAreaElement)?.value
                  updateLeadStatusMutation.mutate({
                    id: viewingLead.id,
                    status: viewingLead.status || 'new',
                    notes: notesVal,
                  })
                  setViewingLead(null)
                }}
                className="px-5 py-2 bg-[#6c5ce7] text-white font-bold rounded-xl shadow-md"
              >
                Save Notes & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
