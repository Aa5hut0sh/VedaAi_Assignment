"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Plus } from "lucide-react";
import { navItems } from "./navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function DesktopSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-gray-100 shrink-0 sticky top-0">
      
      {/* Logo Area */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center text-white font-bold text-lg">
            V
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">VedaAI</span>
        </Link>
      </div>

      {/* Create Button (Matches Figma dark styling with orange accent) */}
      <div className="px-6 mb-6">
        <Link 
          href="/dashboard/create"
          className="flex items-center justify-center gap-2 w-full bg-[#1e1e1e] hover:bg-black text-white py-3 px-4 rounded-full text-sm font-medium transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] border border-gray-800 relative overflow-hidden group"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 group-hover:w-2 transition-all"></div>
          <Plus className="w-4 h-4" />
          Create Assignment
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${isActive ? "text-gray-900" : "text-gray-400"}`} />
                {item.name}
              </div>
              {item.badge && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile / Settings */}
      <div className="p-4 border-t border-gray-100">
        <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4">
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </Link>
        
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-orange-700 font-bold text-sm">
              {user?.name?.charAt(0) || "T"}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.school || "Your School"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.name || "Teacher Profile"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}