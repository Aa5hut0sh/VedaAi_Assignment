"use client";

import { useEffect, useState } from "react";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import TopHeader from "@/components/layout/TopHeader";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import { assignmentService } from "@/services/assignment.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [assignmentCount, setAssignmentCount] = useState(0);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    void assignmentService
      .getAll()
      .then((response) => {
        setAssignmentCount(response.assignments.length);
      })
      .catch(() => {
        setAssignmentCount(0);
      });
  }, [router, token]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <AuthBootstrap />
      {/* Fixed Left Sidebar */}
      <DesktopSidebar assignmentCount={assignmentCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden px-2 md:px-3 py-2 md:py-3">
        {/* Smart Top Header (Breadcrumbs on Desktop, Logo on Mobile) */}
        <TopHeader />

        {/* The Page Content */}
        <main className="flex-1 overflow-y-auto px-2 md:px-4 py-4 md:py-5 pb-32 md:pb-8 w-full">
          <div className="mx-auto w-full h-full" style={{ maxWidth: 1440 }}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
