"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreVertical, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useNotificationStore } from "@/store/useNotificationStore";
import { assignmentService, Assignment } from "@/services/assignment.service";
import { useSocket } from "@/hooks/useSocket";

type AssignmentStatus = Assignment["status"];

export default function AssignmentsPage() {
  const router = useRouter();
  const socket = useSocket();
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Tracks which 3-dot dropdown is currently open
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    void assignmentService
      .getAll()
      .then((response) => {
        setAssignments(response.assignments);
      })
      .catch(() => {
        toast.error("Failed to load assignments");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!socket || assignments.length === 0) return;

    // A. Tell the backend we want to listen to any assignment currently processing
    assignments.forEach((assignment) => {
      if (
        assignment.status === "PENDING" ||
        assignment.status === "PROCESSING"
      ) {
        socket.emit("join-assignment", assignment._id);
      }
    });

    // B. Create the listener function
    const handleStatusUpdate = (data: {
      assignmentId: string;
      status: AssignmentStatus;
    }) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a._id === data.assignmentId ? { ...a, status: data.status } : a,
        ),
      );

      if (data.status === "PROCESSING") {
        toast("Assignment generation started", { icon: "⏳" });
        addNotification({
          type: "info",
          title: "Assignment processing",
          message: "An assignment has started generating.",
        });
      }
      if (data.status === "COMPLETED") {
        toast.success("An assignment has finished generating!");
        addNotification({
          type: "success",
          title: "Assignment ready",
          message: "An assignment finished generating successfully.",
        });
      } else if (data.status === "FAILED") {
        toast.error("An assignment failed to generate.");
        addNotification({
          type: "error",
          title: "Assignment failed",
          message: "An assignment could not be generated.",
        });
      }
    };

    // C. Attach the listener
    socket.on("assignment-status-update", handleStatusUpdate);

    // D. Cleanup the listener on unmount
    return () => {
      socket.off("assignment-status-update", handleStatusUpdate);
    };
  }, [socket, assignments]);

  // Format date helper (e.g., 20-06-2025)
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Delete Handler
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    // Show confirm dialog instead of native confirm
    setOpenDropdownId(null);
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmOpen(false);
    setConfirmId(null);

    try {
      await assignmentService.delete(id);
      toast.success("Assignment deleted");
      addNotification({
        type: "success",
        title: "Assignment deleted",
        message: "The assignment was removed successfully.",
      });
      setAssignments((prev) => prev.filter((a) => a._id !== id));
    } catch {
      toast.error("Failed to delete assignment");
      addNotification({
        type: "error",
        title: "Delete failed",
        message: "We couldn't delete the assignment.",
      });
    }
  };

  // Filter assignments based on search
  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col pb-10"
      onClick={() => setOpenDropdownId(null)}
    >
      <ConfirmDialog
        open={confirmOpen}
        title="Delete assignment"
        message="Are you sure you want to delete this assignment?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={performDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmId(null);
        }}
      />
      {/* 0-STATE (EMPTY STATE) */}
      {assignments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto mt-10 md:mt-20">
          <div className="relative w-64 h-64 mb-6">
            <Image
              src="/images/Illustrations.png"
              alt="No Assignments"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            No assignments yet
          </h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Create your first assignment to start collecting and grading student
            submissions. You can set up rubrics, define marking criteria, and
            let AI assist with grading.
          </p>
          <Link
            href="/dashboard/create"
            className="flex items-center gap-2 bg-[#1c1c1e] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-black transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Create Your First Assignment
          </Link>
        </div>
      ) : (
        /* FILLED STATE (GRID) */
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full block"></span>
                <h1 className="text-2xl font-bold text-gray-900">
                  Assignments
                </h1>
              </div>
              <p className="text-sm text-gray-500 ml-4">
                Manage and create assignments for your classes.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Assignment"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm"
              />
            </div>
          </div>

          {/* Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment._id}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all relative group"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-bold text-gray-900 pr-6 line-clamp-2">
                    {assignment.title}
                  </h3>

                  {/* 3-Dot Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevents the page-level click from closing it immediately
                        setOpenDropdownId(
                          openDropdownId === assignment._id
                            ? null
                            : assignment._id,
                        );
                      }}
                      className="p-1 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-50"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Popup */}
                    {openDropdownId === assignment._id && (
                      <div className="absolute right-0 top-8 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-10 animate-in fade-in zoom-in duration-200">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/assignments/${assignment._id}`,
                            )
                          }
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          View Assignment
                        </button>
                        <button
                          onClick={() => handleDelete(assignment._id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mt-auto">
                  <p>Assigned on : {formatDate(assignment.createdAt)}</p>
                  <p>
                    Due :{" "}
                    {formatDate(assignment.dueDate || assignment.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Action Button for Mobile (Matches Figma) */}
          <div className="md:hidden fixed bottom-24 right-6 z-40">
            <Link
              href="/dashboard/create"
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.2)] text-gray-900"
            >
              <Plus className="w-6 h-6 text-orange-500" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
