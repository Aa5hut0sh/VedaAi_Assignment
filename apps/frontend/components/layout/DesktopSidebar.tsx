"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Plus } from "lucide-react";
import { navItems } from "./navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { assignmentService } from "@/services/assignment.service";
import UserAvatar from "@/components/shared/UserAvatar";
import AppLogo from "./AppLogo";

export default function DesktopSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  
  // Hook into the global assignment store
  const assignmentCount = useAssignmentStore((state) => state.assignmentCount);
  const setAssignmentCount = useAssignmentStore((state) => state.setAssignmentCount);

  // Fetch the initial count when the app loads
  useEffect(() => {
    assignmentService.getAll() // Adjust this method name to match your service (e.g., getAssignments)
      .then((response) => {
        if (response.assignments) {
          setAssignmentCount(response.assignments.length);
        }
      })
      .catch((err) => console.error("Failed to fetch assignment count", err));
  }, [setAssignmentCount]);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white/95 border-r border-white/80 shadow-[0_16px_60px_-40px_rgba(0,0,0,0.35)] shrink-0 sticky top-0 backdrop-blur-xl">
      {/* Logo Area */}
      <div className="p-6">
        <AppLogo />
      </div>

      {/* Create Button */}
      <div className="px-6 mb-6">
        <Link
          href="/dashboard/create"
          className="flex items-center justify-center gap-2 w-full bg-[#1e1e1e] hover:bg-black text-white py-3 px-4 rounded-full text-sm font-medium transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] border border-gray-800 relative overflow-hidden group"
        >
          <Plus className="w-4 h-4" />
          Create Assignment
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname.includes(item.href) &&
            (item.href !== "/dashboard" || pathname === "/dashboard");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? "bg-gray-100 text-gray-900 shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-gray-900" : "text-gray-400"}`}
                />
                {item.name}
              </div>
              {item.name === "Assignments" && assignmentCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {assignmentCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile / Settings */}
      <div className="p-4 border-t border-gray-100">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4"
        >
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </Link>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
          <UserAvatar
            name={user?.name}
            seed={user?.id || user?.email}
            size={40}
            className="shrink-0"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate">
              {user?.school || "Your School"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.name || "Teacher Profile"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}