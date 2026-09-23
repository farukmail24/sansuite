import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  Grip, Megaphone, Search, Plus, Ticket, HelpCircle,
  BarChart3, BookOpen, HeartHandshake, Landmark, Calculator,
  FileText, ListChecks, FileSignature, Link2, Shield,
  Timer, Smartphone, Settings, Users, ChevronRight, User as UserIcon, LogOut, Radio
} from "lucide-react";
import { useWebSocket } from "../../hooks/useWebSocket";

export interface LauncherItem {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  bg: string;
  route: string;
  disabled?: boolean;
}

export const launcherItems: LauncherItem[] = [
  { icon: <BarChart3 size={20} />, label: "Accounts Production", desc: "Fast, integrated accounts filing.", color: "#00b894", bg: "#00b89415", route: "/accounts-production" },
  { icon: <BookOpen size={20} />, label: "Bookkeeping", desc: "Track your purchases and sales.", color: "#0984e3", bg: "#0984e315", route: "/bookkeeping" },
  { icon: <HeartHandshake size={20} />, label: "Charity Accounts", desc: "SORP-compliant reporting.", color: "#e17055", bg: "#e1705515", route: "/charity-accounts" },
  { icon: <Landmark size={20} />, label: "Corporation Tax", desc: "Auto-filled CT600 & iXBRL.", color: "#f39c12", bg: "#f39c1215", route: "/corporation-tax" },
  { icon: <Calculator size={20} />, label: "Payroll", desc: "Accurate and timely payroll management.", color: "#6c5ce7", bg: "#6c5ce715", route: "/payroll" },
  { icon: <FileText size={20} />, label: "Self Assessment", desc: "Seamlessly submit your own tax returns.", color: "#a29bfe", bg: "#a29bfe15", route: "/self-assessment" },
  { icon: <ListChecks size={20} />, label: "Practice Management", desc: "Manage your deadlines and tasks.", color: "#6c5ce7", bg: "#6c5ce715", route: "/practice" },
  { icon: <FileSignature size={20} />, label: "eSign", desc: "Secure electronic signature solution.", color: "#0984e3", bg: "#0984e315", route: "/esign" },
  { icon: <Link2 size={20} />, label: "365", desc: "Communicate and collaborate with clients.", color: "#e17055", bg: "#e1705515", route: "/365" },
  { icon: <Shield size={20} />, label: "Company Secretarial", desc: "Formations and compliance reminders.", color: "#b2bec3", bg: "#b2bec315", route: "/company-secretarial" },
  { icon: <Timer size={20} />, label: "Time and Fees", desc: "Streamline operations for your business.", color: "#00b894", bg: "#00b89415", route: "/time-fees" },
  { icon: <Smartphone size={20} />, label: "MTD IT", desc: "Prepare and submit quarterly submissions.", color: "#6c5ce7", bg: "#6c5ce715", route: "/mtd-it" },
  { icon: <Settings size={20} />, label: "My Admin", desc: "Control Panel — Users, Firm, Billing.", color: "#636e72", bg: "#636e7215", route: "/admin" },
];

export default function GlobalNavActions() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  
  const { data: announcements = [] } = useQuery({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/announcements");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["/api/support/tickets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/support/tickets");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const openTicketsCount = tickets.filter((t: any) => t.status === "Open" || t.status === "In Progress").length;

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) setOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (announceRef.current && !announceRef.current.contains(target)) setAnnounceOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (addRef.current && !addRef.current.contains(target)) setAddOpen(false);
      if (supportRef.current && !supportRef.current.contains(target)) setSupportOpen(false);
      if (helpRef.current && !helpRef.current.contains(target)) setHelpOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex items-center gap-4">
      {/* All Modules Launcher Icon */}
      <div className="flex items-center justify-center cursor-pointer relative group" ref={ref}>
        <div onClick={() => setOpen((o) => !o)}>
          <Grip size={16} className="text-[#a78bfa] hover:text-white transition-colors" />
        </div>
        <div className="absolute top-8 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">All Modules</div>

        {open && (
          <div
            className="fixed right-4 top-[50px] w-[780px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[59] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
            style={{ maxHeight: "650px" }}
          >
            {/* Module Grid */}
            <div className="overflow-y-auto p-4 pt-6" style={{ maxHeight: "560px" }}>
              <div className="grid grid-cols-3 gap-3">
                {launcherItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (!item.disabled) {
                        navigate(item.route);
                        setOpen(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all group/btn ${item.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-gray-50 hover:shadow-sm cursor-pointer"
                      }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover/btn:scale-105"
                      style={{ background: item.bg, color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
                        {item.label}
                        {item.disabled && (
                          <span className="ml-1.5 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Soon</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-3 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">{launcherItems.length} modules available</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/"); setOpen(false); }}
                  className="text-xs font-medium flex items-center gap-1 hover:underline"
                  style={{ color: "#6c5ce7" }}
                >
                  Home <ChevronRight size={11} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Announcements */}
      <div className="flex items-center justify-center cursor-pointer relative group" ref={announceRef}>
        <div onClick={() => setAnnounceOpen(o => !o)} className="relative">
          <Megaphone size={16} className={`${announceOpen ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`} />
          {announcements.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 border-2 border-[#1e1e2d] rounded-full"></span>
          )}
        </div>
        {!announceOpen && <div className="absolute top-8 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">Announcements</div>}
        
        {announceOpen && (
          <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">System Broadcasts</span>
              {announcements.length > 0 && <button className="text-xs text-purple-600 hover:underline">Mark all read</button>}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs">No active announcements</div>
              ) : (
                announcements.map((ann: any) => (
                  <div key={ann.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800">{ann.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ann.message}</p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center justify-center cursor-pointer relative group hidden sm:flex" ref={searchRef}>
        <div onClick={() => setSearchOpen(o => !o)}>
          <Search size={16} className={`${searchOpen ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`} />
        </div>
        {!searchOpen && <div className="absolute top-8 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">Search</div>}
        
        {searchOpen && (
          <div className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input autoFocus type="text" placeholder="Search clients, invoices..." className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400" />
            </div>
          </div>
        )}
      </div>

      {/* Add New */}
      <div className="flex items-center justify-center cursor-pointer relative group" ref={addRef}>
        <div onClick={() => setAddOpen(o => !o)}>
          <Plus size={16} className={`${addOpen ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`} />
        </div>
        {!addOpen && <div className="absolute top-8 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">Quick Add</div>}
        
        {addOpen && (
          <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Create New</div>
            <button onClick={() => { setAddOpen(false); navigate("/practice/crm"); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Client</button>
            <button onClick={() => { 
              setAddOpen(false); 
              const m = location.match(/\/bookkeeping\/(\d+)/);
              const cid = m ? m[1] : null;
              navigate(cid ? `/bookkeeping/${cid}/invoices/new` : "/bookkeeping"); 
            }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Sales Invoice</button>
            <button onClick={() => { 
              setAddOpen(false); 
              const m = location.match(/\/bookkeeping\/(\d+)/);
              const cid = m ? m[1] : null;
              navigate(cid ? `/bookkeeping/${cid}/purchases/new` : "/bookkeeping"); 
            }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Purchase Bill</button>
            <button onClick={() => { setAddOpen(false); navigate("/admin/users"); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Staff User</button>
          </div>
        )}
      </div>

      {/* Tickets/Support */}
      <div className="flex items-center justify-center cursor-pointer relative group" ref={supportRef}>
        <div onClick={() => setSupportOpen(o => !o)} className="relative">
          <Ticket size={16} className={`${supportOpen ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`} />
          {openTicketsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-[#1e1e2d] rounded-full flex items-center justify-center text-[8px] font-bold text-white">
              {openTicketsCount}
            </span>
          )}
        </div>
        {!supportOpen && <div className="absolute top-8 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">Support Tickets</div>}
        
        {supportOpen && (
          <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">Support Center</span>
              <button 
                onClick={() => { setSupportOpen(false); navigate("/support?new=true"); }}
                className="text-xs text-purple-600 font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> New Ticket
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs flex flex-col items-center">
                  <Ticket size={24} className="text-gray-300 mb-2" />
                  You have no support tickets.
                </div>
              ) : (
                tickets.slice(0, 5).map((ticket: any) => (
                  <div key={ticket.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate pr-2">{ticket.subject}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ticket.status === 'Open' ? 'bg-amber-100 text-amber-700' :
                        ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>#{ticket.id} • {ticket.category}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-2 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => { setSupportOpen(false); navigate("/support"); }}
                className="w-full py-1.5 text-xs text-gray-600 font-medium hover:bg-gray-100 rounded transition-colors text-center"
              >
                View All Tickets
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="flex items-center justify-center cursor-pointer relative group" ref={helpRef}>
        <div onClick={() => setHelpOpen(o => !o)}>
          <HelpCircle size={16} className={`${helpOpen ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`} />
        </div>
        {!helpOpen && <div className="absolute top-8 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">Help</div>}
        
        {helpOpen && (
          <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
            <button onClick={() => { setHelpOpen(false); navigate("/help/knowledge-base"); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Knowledge Base</button>
            <button onClick={() => { setHelpOpen(false); navigate("/help/video-tutorials"); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Video Tutorials</button>
            <button onClick={() => { setHelpOpen(false); navigate("/help/keyboard-shortcuts"); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Keyboard Shortcuts</button>
            <div className="border-t my-1"></div>
            <button onClick={() => { setHelpOpen(false); navigate("/help/contact-us"); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Contact Us</button>
          </div>
        )}
      </div>

      {/* Live WebSocket Status Dot */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1f2937] rounded-md text-[10px] text-gray-300 border border-gray-700">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
        <span>{isConnected ? 'LIVE' : 'SYNC'}</span>
      </div>

      {/* Profile / Logout */}
      <div
        className="flex items-center justify-center cursor-pointer relative group"
        ref={profileRef}
      >
        <div 
          onClick={() => setProfileOpen((p) => !p)}
          className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold hover:ring-2 ring-purple-400 transition-all shadow-sm"
        >
          {user?.firstName?.[0] ?? "U"}
        </div>
        
        {!profileOpen && (
          <div className="absolute top-10 right-0 hidden group-hover:block bg-[#1f2937] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-[60] shadow-lg">
            Profile
          </div>
        )}

        {profileOpen && (
          <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-col">
              <span className="text-sm font-semibold text-gray-800">{user?.firstName} {user?.lastName}</span>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/profile");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <UserIcon size={16} /> My Profile
              </button>
              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
