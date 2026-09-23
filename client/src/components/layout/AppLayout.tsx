import { useLocation, useSearch, Link } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import {
  Building2, Bell, Search, LogOut, ChevronDown, Home,
  BookOpen, Users, FileText, DollarSign, BarChart3,
  ClipboardList, PenTool, Clock, Settings, Menu, X,
  Megaphone, Plus, Ticket, HelpCircle, User, Copyright,
  Grip, Shield, HeartHandshake, Landmark, Calculator,
  ListChecks, Link2, FileSignature, Smartphone, Timer,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import GlobalNavActions from "./GlobalNavActions";
import SystemAnnouncementsBanner from "./SystemAnnouncementsBanner";
import SupportTicketWidget from "./SupportTicketWidget";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";

export interface NavItem {
  label: string;
  icon?: React.ReactNode;
  route?: string;
  children?: { label: string; route: string }[];
  isHeader?: boolean;
}

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: NavItem[];
  module?: string;
}

export default function AppLayout({ children, sidebar, module }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const fullLocation = searchString ? `${location}?${searchString}` : location;
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [logoError, setLogoError] = useState(false);

  const { data: firmData } = useQuery({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white print:min-h-0">
      {/* Top Navbar */}
      <nav className="SanSuite-navbar" style={{ zIndex: 50 }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors mr-1 cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer">
            {firmData?.logoUrl && !logoError ? (
              <img
                src={firmData.logoUrl}
                alt={firmData.firmName || "Firm Logo"}
                onError={() => setLogoError(true)}
                className="w-7 h-7 rounded-lg object-cover bg-white/10 p-0.5 border border-white/20 shadow-sm"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-inner shrink-0" style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" }}>
                <Building2 size={15} className="text-white" />
              </div>
            )}
            <div className="text-left hidden sm:block">
              <span className="text-white font-bold text-sm tracking-tight block leading-none">
                {firmData?.firmName || (user as any)?.practiceName || "SAN Accounting Firm"}
              </span>
            </div>
          </button>
        </div>

        {/* Clean center spacer */}
        <div className="flex-1" />

        <GlobalNavActions />
      </nav>


      <div className="flex pt-12">
        {/* Sidebar — fixed positioned, so main needs margin */}
        {sidebar && (
          <aside
            className="SanSuite-sidebar transition-all duration-200"
            style={{
              width: sidebarOpen ? 230 : 0,
              overflowY: sidebarOpen ? "auto" : "hidden",
              overflowX: "hidden",
              minWidth: sidebarOpen ? 230 : 0,
            }}
          >

            {/* Module badge */}
            {module && (
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-[10.5px] font-bold tracking-widest text-slate-400 uppercase truncate">{module}</p>
              </div>
            )}

            <nav className="py-1 px-0">
              {sidebar.map((item, index) => {
                if (item.isHeader) {
                  return (
                    <div
                      key={`header-${item.label}-${index}`}
                      className="pt-3.5 pb-1 px-3 text-[10px] font-bold tracking-wider text-slate-400/90 uppercase select-none border-t border-white/5 first:border-0 first:pt-1"
                    >
                      {item.label}
                    </div>
                  );
                }

                const currentTabParam = new URLSearchParams(searchString).get("tab");
                const hasActiveChild = item.children?.some((c) => {
                  if (c.route === fullLocation) return true;
                  const cBase = c.route.split("?")[0];
                  if (location === cBase) return true;
                  return false;
                });
                const isExpanded = expandedItems[item.label] !== undefined ? expandedItems[item.label] : hasActiveChild;

                return (
                  <div key={item.label} className="mb-0.5">
                    {item.children ? (
                      <>
                        <button
                          onClick={() => toggleExpand(item.label)}
                          className={`SanSuite-sidebar-item w-full justify-between group ${hasActiveChild ? "text-purple-300 font-semibold bg-purple-500/10" : ""}`}
                        >
                          <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
                            <span className="shrink-0 flex items-center justify-center w-4 text-slate-400 group-hover:text-white">
                              {item.icon}
                            </span>
                            <span className="truncate whitespace-nowrap text-[13px] font-medium leading-none">{item.label}</span>
                          </span>
                          <ChevronDown
                            size={13}
                            className={`shrink-0 ml-1 text-slate-400 group-hover:text-white transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="bg-black/25 rounded-md my-0.5 py-0.5">
                            {item.children.map((child) => {
                              let isChildActive = child.route === fullLocation;

                              if (!isChildActive) {
                                if (child.route && !child.route.includes("?")) {
                                  isChildActive = location === child.route;
                                }
                              }

                              return (
                                <Link
                                  key={child.label}
                                  href={child.route || "#"}
                                  onClick={() => {
                                    if (child.route) {
                                      navigate(child.route);
                                    }
                                  }}
                                  className={`SanSuite-sidebar-item pl-6 pr-2 py-1.5 w-full text-left block text-[12.5px] truncate whitespace-nowrap ${isChildActive ? "active" : "text-slate-300 hover:text-white"
                                    }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.route || "#"}
                        className={`SanSuite-sidebar-item w-full text-left flex items-center justify-between group ${
                          item.route === fullLocation ||
                          (location === item.route && !item.route?.includes("?") && !searchString?.includes("tab=")) ||
                          (item.route === "/365/dashboard" && (location === "/365" || location === "/365/dashboard") && !searchString?.includes("tab=")) ||
                          (item.route === "/365/clients" && (location === "/365/clients" || location === "/365/manage/clients" || searchString?.includes("tab=clients"))) ||
                          (item.route === "/365/users" && (location === "/365/users" || location === "/365/manage/users" || searchString?.includes("tab=users"))) ||
                          (item.route === "/365/imports" && (location === "/365/imports" || location === "/365/manage/imports" || searchString?.includes("tab=imports"))) ||
                          (item.route === "/365/permissions" && (location === "/365/permissions" || location === "/365/permission" || location?.startsWith("/365/manage/permission") || searchString?.includes("tab=permissions")))
                            ? "active"
                            : ""
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="shrink-0 flex items-center justify-center w-4 text-slate-400 group-hover:text-white">
                            {item.icon}
                          </span>
                          <span className="truncate whitespace-nowrap text-[13px] font-medium leading-none">{item.label}</span>
                        </span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        )}

        <main
          className="flex-1 min-h-screen overflow-x-hidden transition-all duration-200 flex flex-col print:bg-white print:min-h-0 print:p-0 print:m-0 print:static"
          style={{
            background: "#f0f2f5",
            marginLeft: sidebar ? (sidebarOpen ? 230 : 0) : 0,
          }}
        >
          <SystemAnnouncementsBanner />
          {children}
        </main>
      </div>

      <SupportTicketWidget />
    </div>
  );
}
