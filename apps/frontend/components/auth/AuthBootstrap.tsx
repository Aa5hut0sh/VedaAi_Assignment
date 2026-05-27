"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthBootstrap() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (user) {
      return;
    }

    void authService
      .me()
      .then((response) => {
        setAuth(response.user, token);
      })
      .catch(() => {
        clearAuth();
        router.replace("/login");
      });
  }, [token, user, setAuth, clearAuth, router]);

  return null;
}
