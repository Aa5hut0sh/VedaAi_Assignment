"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Grid2X2,
  Info,
  LogOut,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import UserAvatar from "@/components/shared/UserAvatar";
import AppLogo from "./AppLogo";
import { authService } from "@/services/auth.service";

export default function MobileHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification,
  );
  const clearNotifications = useNotificationStore(
    (state) => state.clearNotifications,
  );
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const titleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/assignments": "Assignments",
    "/dashboard/create": "Create Assignment",
    "/dashboard/groups": "My Groups",
    "/dashboard/library": "My Library",
    "/dashboard/toolkit": "AI Teacher's Toolkit",
    "/dashboard/settings": "Settings",
  };

  const pageTitle = titleMap[pathname] || "Assignment";
  const backHref = pathname.startsWith("/dashboard/assignments/")
    ? "/dashboard/assignments"
    : "/dashboard";
  const showBack = pathname !== "/dashboard";
  const notificationCount = notifications.length;

  const formattedNotifications = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        relativeTime: formatRelativeTime(notification.createdAt),
      })),
    [notifications],
  );

  const handleLogout = () => {
    authService.logout();
    clearAuth();
    router.replace("/login");
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;

      const toggle = (event.target as HTMLElement | null)?.closest(
        "[data-notification-toggle='true']",
      );
      if (!toggle) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }
  }, [isNotificationsOpen]);

  function formatRelativeTime(timestamp: number) {
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <>
      <header className="hidden md:flex relative z-50  items-center justify-between rounded-[22px] bg-white/92 px-6 py-3 shadow-[0_12px_50px_-28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(showBack ? backHref : "/dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Grid2X2 className="h-4 w-4" />
            <span>{pageTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            data-notification-toggle="true"
            onClick={() => setIsNotificationsOpen((value) => !value)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((value) => !value)}
              className="flex items-center gap-3 rounded-full bg-gray-50 px-3 py-1.5 text-left transition-colors hover:bg-gray-100"
            >
              <UserAvatar
                name={user?.name}
                seed={user?.id || user?.email}
                size={28}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {user?.name || "John Doe"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-12 z-200 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_14px_40px_-18px_rgba(0,0,0,0.45)]">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white/92 px-4 py-3 backdrop-blur-xl">
        <AppLogo compact />

        <div className="flex items-center gap-3">
          <button
            data-notification-toggle="true"
            onClick={() => setIsNotificationsOpen((value) => !value)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-700"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
          <UserAvatar
            name={user?.name}
            seed={user?.id || user?.email}
            size={34}
          />
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-800"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isNotificationsOpen && (
        <div
          ref={panelRef}
          className="fixed right-3 top-16 w-[min(92vw,22rem)] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] md:right-6 md:top-[4.8rem]"
          style={{ zIndex: 220 }}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">
                Recent updates from VedaAI
              </p>
            </div>
            <button
              onClick={() => {
                clearNotifications();
                setIsNotificationsOpen(false);
              }}
              className="rounded-full px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {formattedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {formattedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-50">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-gray-600">
                            {notification.message}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          aria-label="Dismiss notification"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                        <Clock3 className="h-3 w-3" />
                        <span>{notification.relativeTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
