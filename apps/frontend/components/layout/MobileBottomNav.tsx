"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { navItems } from "./navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  // On mobile, we usually only show 4 main icons to prevent crowding
  const mobileNavItems = navItems.filter(item => 
    ["Home", "Assignments", "My Library", "AI Teacher's Toolkit"].includes(item.name)
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      
      {/* Floating Create Button */}
      <div className="flex justify-end px-6 mb-2 pointer-events-auto">
        <Link 
          href="/dashboard/create" 
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 text-gray-900"
        >
          <Plus className="w-6 h-6 text-orange-500" />
        </Link>
      </div>

      {/* Dark Pill Navigation */}
      <div className="px-4 pb-4 pointer-events-auto">
        <nav className="bg-[#1c1c1e] rounded-3xl flex items-center justify-between px-6 py-3 shadow-2xl">
          {mobileNavItems.map((item) => {
            const isActive = pathname.includes(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center gap-1 min-w-[60px]"
              >
                <item.icon 
                  className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-400"}`} 
                />
                <span className={`text-[10px] font-medium ${isActive ? "text-white" : "text-gray-400"}`}>
                  {/* Shorten name for mobile fit */}
                  {item.name === "AI Teacher's Toolkit" ? "AI Toolkit" : item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}