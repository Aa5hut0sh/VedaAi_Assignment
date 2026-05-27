"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore.getState().isAuthenticated;

  useEffect(() => {
    router.replace(isAuthenticated ? "/dashboard/assignments" : "/login");
  }, [isAuthenticated, router]);

  return null;
}
