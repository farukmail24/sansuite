import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { Play, Clock, Video, Sparkles, X, CheckCircle } from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  duration: string;
  category: string;
  thumbnailUrl: string;
  description: string;
  steps: string[];
}

const tutorials: Tutorial[] = [
  {
    id: "1",
    title: "Getting Started with SanSuite Bookkeeping",
    duration: "4 mins 15 secs",
    category: "Bookkeeping",
    thumbnailUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    description: "Learn how to navigate the bookkeeping module, set up your Chart of Accounts, and record sales invoices.",
    steps: [
      "Navigate to Bookkeeping module",
      "Configure default nominal codes & VAT rates",
      "Create your first sales invoice and payment record",
      "Review Profit & Loss and Trial Balance summaries",
    ],
  },
  {
    id: "2",
    title: "HMRC Making Tax Digital (MTD) VAT Submissions",
    duration: "5 mins 45 secs",
    category: "HMRC MTD",
    thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    description: "Step-by-step walkthrough of connecting your HMRC Gateway account and submitting VAT Box 1-9 returns.",
    steps: [
      "Open MTD Portal in Bookkeeping",
      "Authenticate via HMRC OAuth2 Gateway",
      "Review automated Box 1-9 VAT calculations",
      "Click Submit and download submission receipt",
    ],
  },
  {
    id: "3",
    title: "Monthly Pay Run & Automated Payslip Generation",
    duration: "6 mins 20 secs",
    category: "Payroll",
    thumbnailUrl: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80",
    description: "How to process employee payroll, calculate PAYE & NI deductions, and generate downloadable PDF payslips.",
    steps: [
      "Add employees with tax codes & National Insurance numbers",
      "Create a new Pay Run for the tax month",
      "Verify Gross Pay to Net Pay calculations",
      "Approve Pay Run and export RTI FPS XML",
    ],
  },
  {
    id: "4",
    title: "eSign E-Signature Setup for Client Documents",
    duration: "3 mins 50 secs",
    category: "eSign",
    thumbnailUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80",
    description: "Learn how to send document signature requests to clients and track legal eIDAS signature completions.",
    steps: [
      "Upload PDF in eSign launcher",
      "Add client signer email and verification token",
      "Send signature request link",
      "Track live status from Awaiting to Signed",
    ],
  },
];

export default function VideoTutorialsPage() {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Bookkeeping", "HMRC MTD", "Payroll", "eSign"];

  const filteredTutorials = tutorials.filter(
    (t) => selectedCategory === "All" || t.category === selectedCategory
  );

  return (
    <AppLayout module="Help & Video Tutorials">
      <div className="bg-gray-50 min-h-screen">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-slate-800 to-purple-900 text-white py-12 px-6 shadow-md">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-purple-200">
              <Sparkles size={14} /> Video Training Library
            </div>
            <h1 className="text-3xl font-bold">Video Tutorials & Walkthroughs</h1>
            <p className="text-gray-300 text-sm max-w-xl mx-auto">
              Watch interactive step-by-step guides to master SanSuite accounting, payroll, and HMRC tax filing.
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tutorial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTutorials.map((tut) => (
              <div
                key={tut.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 bg-gray-900 overflow-hidden cursor-pointer" onClick={() => setSelectedTutorial(tut)}>
                    <img
                      src={tut.thumbnailUrl}
                      alt={tut.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-14 h-14 bg-purple-600/90 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Play size={24} className="ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                      <Clock size={12} /> {tut.duration}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded">
                      {tut.category}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800 leading-snug">{tut.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{tut.description}</p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => setSelectedTutorial(tut)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Video size={16} /> Watch Tutorial & Steps
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Player Modal */}
        {selectedTutorial && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
              <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video size={18} className="text-purple-400" />
                  <span className="font-bold text-sm truncate">{selectedTutorial.title}</span>
                </div>
                <button onClick={() => setSelectedTutorial(null)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Mock Player Screen */}
              <div className="relative h-64 bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4 shadow-xl animate-pulse">
                  <Play size={28} className="ml-1" />
                </div>
                <p className="text-sm font-semibold">Playing Tutorial Preview</p>
                <p className="text-xs text-gray-400 mt-1">Duration: {selectedTutorial.duration}</p>
              </div>

              {/* Step-by-Step Guide */}
              <div className="p-6 bg-white space-y-4">
                <h4 className="font-bold text-gray-800 text-sm">Step-by-Step Instructions:</h4>
                <div className="space-y-2">
                  {selectedTutorial.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <CheckCircle size={16} className="text-purple-600 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
