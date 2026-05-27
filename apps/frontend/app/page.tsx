"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, FileText, Zap, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Prevent Hydration mismatch by only rendering after mount
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // If they are already logged in, redirect them instantly
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Show nothing while checking auth status to prevent flashing the landing page
  if (!isMounted || isAuthenticated) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-white selection:bg-orange-100 selection:text-orange-900">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
              V
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">VedaAI</span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="bg-[#1c1c1e] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-black transition-all shadow-md hover:shadow-xl hover:shadow-black/10"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 sm:pt-40 sm:pb-24">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-sm font-bold tracking-wide mb-4">
            <Sparkles className="w-4 h-4" />
            <span>The Future of Teaching</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
            Create Question Papers <br className="hidden sm:block" />
            in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Seconds, Not Hours.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 font-medium leading-relaxed">
            Upload your syllabus, configure your question types, and let our AI generate perfectly formatted, grade-appropriate exam papers and answer keys instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1c1c1e] text-white px-8 py-4 rounded-full text-base font-bold hover:bg-black transition-all shadow-lg hover:shadow-2xl hover:shadow-black/20 group"
            >
              Start Generating for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full text-base font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              <LayoutDashboard className="w-5 h-5" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Feature Highlight Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 mb-6">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
            <p className="text-gray-500 leading-relaxed">
              Powered by Groq's high-speed inference. Get highly accurate, curriculum-aligned questions generated in under 3 seconds.
            </p>
          </div>

          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 mb-6">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant PDFs</h3>
            <p className="text-gray-500 leading-relaxed">
              Every assignment comes with a beautifully formatted, print-ready PDF including school headers, student info blocks, and answer keys.
            </p>
          </div>

          <div className="bg-[#1c1c1e] rounded-3xl p-8 border border-gray-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 mb-6">
              <LayoutDashboard className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Modular Tracking</h3>
            <p className="text-gray-400 leading-relaxed">
              Keep all your generated papers organized in one dashboard. Regenerate, view, or delete assignments with a single click.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}