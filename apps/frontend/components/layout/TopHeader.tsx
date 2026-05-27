"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function MobileHeader() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 rounded flex items-center justify-center text-white font-bold text-sm">
          V
        </div>
        <span className="text-lg font-bold text-gray-900">VedaAI</span>
      </Link>

      <div className="flex items-center gap-4">
        <button className="relative text-gray-500">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
          <span className="text-xs font-bold text-gray-600">{user?.name?.charAt(0) || "U"}</span>
        </div>
        
        <button className="text-gray-900">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}