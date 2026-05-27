"use client";

import { ReactNode } from "react";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import TopHeader from "@/components/layout/TopHeader";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f4f4f5] overflow-hidden">
      
      {/* Fixed Left Sidebar */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
        
        {/* Smart Top Header (Breadcrumbs on Desktop, Logo on Mobile) */}
        <TopHeader />

        {/* The Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-6 pb-32 md:pb-8 w-full">
          <div className="max-w-6xl mx-auto w-full h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
        
      </div>
    </div>
  );
}