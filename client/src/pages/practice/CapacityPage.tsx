import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import {
  Users, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  UserCheck 
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function CapacityPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Query users from backend
  const { data: teamMembers = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Query tasks from backend
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/tasks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/tasks");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const staffCapacityList = teamMembers.map((member: any) => {
    const memberTasks = tasks.filter((t: any) => t.assignedTo === member.id || t.assignedBy === member.id);
    const allocatedHours = Math.round(memberTasks.reduce((acc: number, t: any) => acc + (parseFloat(t.estimatedHours) || 3.5), 0) * 10) / 10;
    const completedHours = Math.round(memberTasks.filter((t: any) => (t.status || "").toLowerCase() === "completed").reduce((acc: number, t: any) => acc + (parseFloat(t.estimatedHours) || 3.5), 0) * 10) / 10;
    const weeklyCapacity = parseFloat(member.weeklyHours) || 37.5;
    const utilizationRate = weeklyCapacity > 0 ? Math.round((allocatedHours / weeklyCapacity) * 100) : 0;

    let status: "optimal" | "overloaded" | "underutilized" = "optimal";
    if (utilizationRate > 100) status = "overloaded";
    else if (utilizationRate < 70) status = "underutilized";

    return {
      id: member.id,
      name: `${member.firstName} ${member.lastName || ''}`,
      email: member.email,
      role: (member.role || "STAFF").toUpperCase(),
      weeklyCapacity,
      allocatedHours,
      completedHours,
      activeProjects: memberTasks.filter((t: any) => (t.status || "").toLowerCase() !== "completed").length,
      utilizationRate,
      status
    };
  });

  const filteredStaff = staffCapacityList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-gray-50 min-h-screen p-6 w-full space-y-6">

        {/* Header Banner */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Workload & Capacity Planning</h1>
              <p className="text-xs text-gray-500">Live practice staff billable capacity, task distribution, and utilization rates.</p>
            </div>
          </div>
        </div>

        {/* Capacity Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2 border-t-4 border-t-purple-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Practice Staff</span>
              <Users size={18} className="text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900">{staffCapacityList.length}</div>
            <p className="text-xs text-gray-500 font-medium">Active practice team members</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2 border-t-4 border-t-emerald-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Optimal Utilization</span>
              <UserCheck size={18} className="text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-700">
              {staffCapacityList.filter(s => s.status === 'optimal').length}
            </div>
            <p className="text-xs text-emerald-600 font-medium">Staff within target workload range</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2 border-t-4 border-t-amber-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Overloaded Workloads</span>
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div className="text-3xl font-extrabold text-amber-700">
              {staffCapacityList.filter(s => s.status === 'overloaded').length}
            </div>
            <p className="text-xs text-amber-600 font-medium">Staff exceeding 100% capacity</p>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="font-bold text-gray-900 text-lg">Staff Capacity Breakdown</h2>

            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff name or role..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3">Staff Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Weekly Capacity</th>
                  <th className="px-6 py-3">Allocated Hours</th>
                  <th className="px-6 py-3">Active Tasks</th>
                  <th className="px-6 py-3">Utilization Rate</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{staff.name}</td>
                    <td className="px-6 py-4 text-gray-600">{staff.role}</td>
                    <td className="px-6 py-4 text-gray-700">{staff.weeklyCapacity} hrs/wk</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{staff.allocatedHours} hrs</td>
                    <td className="px-6 py-4 text-purple-700 font-bold">{staff.activeProjects} tasks</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              staff.status === 'overloaded' ? 'bg-rose-500' :
                              staff.status === 'optimal' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, staff.utilizationRate)}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-900">{staff.utilizationRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        staff.status === 'optimal' ? 'bg-emerald-100 text-emerald-800' :
                        staff.status === 'overloaded' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {staff.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
