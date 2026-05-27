"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  Sparkles,
  ArrowRight,
  Users,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { assignmentService, Assignment } from "@/services/assignment.service";
import { useAuthStore } from "@/store/useAuthStore";
import UserAvatar from "@/components/shared/UserAvatar";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void assignmentService
      .getAll()
      .then((response) => {
        setAssignments(response.assignments);
      })
      .catch(() => {
        toast.error("Failed to load dashboard stats");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    (item) => item.status === "COMPLETED",
  ).length;
  const generatingAssignments = assignments.filter(
    (item) => item.status === "PROCESSING",
  ).length;
  const totalQuestions = assignments.reduce((sum, item) => {
    const questionConfigTotal =
      item.questionConfig?.reduce(
        (questionSum, config) => questionSum + (config.count || 0),
        0,
      ) || 0;

    return sum + (item.generatedPaper?.totalQuestions || questionConfigTotal);
  }, 0);

  const recentAssignments = assignments.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="rounded-4xl border border-white/70 bg-white/85 p-6 md:p-8 shadow-[0_18px_60px_-34px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user?.name}
              seed={user?.id || user?.email}
              size={64}
            />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                <Sparkles className="h-3.5 w-3.5" />
                Teacher Dashboard
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900">
                {user?.name || "Teacher"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {user?.school || "Your School"} • {user?.role || "TEACHER"}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/create"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_rgba(0,0,0,0.55)] transition-colors hover:bg-black"
          >
            Create Assignment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assignments", value: totalAssignments, icon: FileText },
          {
            label: "Completed",
            value: completedAssignments,
            icon: CheckCircle,
          },
          { label: "Generating", value: generatingAssignments, icon: Loader2 },
          { label: "Questions", value: totalQuestions, icon: Users },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_16px_48px_-32px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {isLoading ? "--" : stat.value}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-700">
                <stat.icon
                  className={`h-5 w-5 ${stat.label === "Generating" && !isLoading ? "animate-spin text-orange-500" : ""}`}
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_16px_52px_-34px_rgba(0,0,0,0.38)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Assignments
              </h2>
              <p className="text-sm text-gray-500">
                Latest generated or processing papers
              </p>
            </div>
            <Link
              href="/dashboard/assignments"
              className="text-sm font-semibold text-gray-900 hover:text-orange-600"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentAssignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
                No assignments yet. Create your first one to get started.
              </div>
            ) : (
              recentAssignments.map((assignment) => (
                <div
                  key={assignment._id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4"
                >
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {assignment.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {assignment.subject} • Class {assignment.className}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/assignments/${assignment._id}`}
                    className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Open
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_16px_52px_-34px_rgba(0,0,0,0.38)]">
          <h2 className="text-xl font-semibold text-gray-900">
            Teacher Snapshot
          </h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                School
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {user?.school || "Your School"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {user?.email || "teacher@school.edu"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Role
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {user?.role || "TEACHER"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
