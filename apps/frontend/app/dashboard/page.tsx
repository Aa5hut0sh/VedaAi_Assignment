"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  FileText, Clock, CheckCircle, AlertCircle, 
  Loader2, Download, Plus, BookOpen
} from "lucide-react";

// Matches your backend schema
interface Assignment {
  _id: string;
  title: string;
  subject: string;
  className: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pdfStatus: "NONE" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pdfUrl?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch assignments on load
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/assignments/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssignments(res.data.assignments);
      } catch (error) {
        console.error("Failed to fetch assignments", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchAssignments();
  }, [token]);

  // Helper to render the correct status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="w-3.5 h-3.5" /> Ready
          </span>
        );
      case "PROCESSING":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating AI...
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Assignments</h2>
          <p className="text-gray-500 text-sm mt-1">Manage and view your generated question papers.</p>
        </div>
        <Link 
          href="/dashboard/create" 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Assignment
        </Link>
      </div>

      {/* Empty State */}
      {assignments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center shadow-sm">
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No assignments yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm">
            You haven't generated any question papers. Upload a syllabus or topic list to get started.
          </p>
          <Link href="/dashboard/create" className="text-blue-600 font-medium hover:underline">
            Create your first assignment &rarr;
          </Link>
        </div>
      ) : (
        /* Grid of Assignment Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <div 
              key={assignment._id} 
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  {renderStatusBadge(assignment.status)}
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(assignment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                  {assignment.title}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mr-2.5 text-gray-400" />
                    {assignment.subject}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2.5 text-gray-400" />
                    Class {assignment.className}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="border-t border-gray-100 p-4 bg-gray-50 flex gap-3">
                <Link 
                  href={`/dashboard/assignment/${assignment._id}`}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  View Details
                </Link>
                
                <button 
                  disabled={assignment.status !== "COMPLETED"}
                  className="flex items-center justify-center gap-2 flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}