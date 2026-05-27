"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  Download,
  RefreshCw,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { assignmentService } from "@/services/assignment.service";
import { useSocket } from "@/hooks/useSocket";
import { useNotificationStore } from "@/store/useNotificationStore";

type QuestionItem = {
  difficulty?: string;
  marks: number;
  text: string;
  answer: string;
};

type GeneratedSection = {
  title: string;
  instructions?: string;
  questions: QuestionItem[];
};

type GeneratedPaper = {
  totalMarks?: number;
  sections: GeneratedSection[];
};

type AssignmentDetails = {
  title: string;
  subject: string;
  className: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pdfStatus: "NONE" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pdfUrl?: string;
  timeAllowed?: number;
  generatedPaper?: GeneratedPaper;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReviewHtml = (assignment: AssignmentDetails) => {
  const schoolName = assignment.title;
  const sections = assignment.generatedPaper?.sections || [];
  const totalMarks = assignment.generatedPaper?.totalMarks || 0;

  let htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; font-size: 14px; }
              .text-center { text-align: center; }
              .header-school { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
              .header-sub { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
              .flex-between { display: flex; justify-content: space-between; font-weight: bold; margin-top: 30px; margin-bottom: 20px; gap: 12px; }
              @media (max-width: 640px) {
                .flex-between { flex-direction: column; align-items: flex-start; }
              }
              .compulsory-text { font-weight: bold; margin-bottom: 20px; }
              .student-info p { margin: 8px 0; }
              .section-title { text-align: center; font-size: 18px; font-weight: bold; margin-top: 40px; margin-bottom: 15px; }
              .instructions { font-style: italic; margin-bottom: 15px; font-size: 13px; }
              .question-list { list-style-type: decimal; padding-left: 20px; margin-bottom: 30px; }
              .question-item { margin-bottom: 15px; }
              .end-paper { font-weight: bold; margin-top: 40px; margin-bottom: 40px; font-size: 14px; }
              .answer-key-header { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
              .answer-list { list-style-type: decimal; padding-left: 20px; }
              .answer-item { margin-bottom: 15px; }
            </style>
          </head>
          <body>
            <div class="text-center">
              <div class="header-school">${escapeHtml(schoolName)}</div>
              <div class="header-sub">Subject: ${escapeHtml(assignment.subject)}</div>
              <div class="header-sub">Class: ${escapeHtml(assignment.className)}</div>
            </div>

            <div class="flex-between">
              <span>Time Allowed: ${assignment.timeAllowed || 0} minutes</span>
              <span>Maximum Marks: ${totalMarks}</span>
            </div>

            <div class="compulsory-text">All questions are compulsory unless stated otherwise.</div>

            <div class="student-info">
              <p>Name: __________________________</p>
              <p>Roll Number: ___________________</p>
              <p>Class: ${escapeHtml(assignment.className)} Section: ________</p>
            </div>
      `;

  let answerKeyHtml = `<div class="end-paper">End of Question Paper</div>
                           <div class="answer-key-header">Answer Key:</div>
                           <ol class="answer-list">`;

  sections.forEach((section) => {
    htmlContent += `
          <div class="section-title">${escapeHtml(section.title)}</div>
          <div class="instructions">${section.instructions ? escapeHtml(section.instructions) : ""}</div>
          <ol class="question-list">
        `;

    section.questions.forEach((q) => {
      htmlContent += `
            <li class="question-item">
              [${escapeHtml(q.difficulty || "")} ] ${escapeHtml(q.text)} [${q.marks} Marks]
            </li>
          `;

      answerKeyHtml += `
            <li class="answer-item">${escapeHtml(q.answer)}</li>
          `;
    });

    htmlContent += `</ol>`;
  });

  answerKeyHtml += `</ol>`;
  htmlContent += answerKeyHtml;
  htmlContent += `</body></html>`;

  return htmlContent;
};

export default function ViewAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const socket = useSocket();
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  // modal state removed — using toast notifications

  const refreshAssignment = useCallback(() => {
    if (!assignmentId) return;

    void assignmentService
      .getById(assignmentId)
      .then((response) => {
        setAssignment(response.assignment);
      })
      .catch(() => {
        toast.error("Failed to load assignment details");
        router.push("/dashboard/assignments");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [assignmentId, router]);

  useEffect(() => {
    if (!socket || !assignmentId) return;

    // A. Join the specific room for this assignment
    socket.emit("join-assignment", assignmentId);

    // B. Listener for the AI Generation Status
    const handleAiUpdate = (data: {
      assignmentId: string;
      status: AssignmentDetails["status"];
    }) => {
      if (data.assignmentId !== assignmentId) return;

      setAssignment((prev) => (prev ? { ...prev, status: data.status } : prev));

      if (data.status === "PROCESSING") {
        toast("Generating assignment paper...", { icon: "⏳" });
        addNotification({
          type: "info",
          title: "Assignment processing",
          message: "An assignment is being generated.",
        });
      }

      // If it finished, we need to fetch from the DB to get the actual JSON paper payload
      if (data.status === "COMPLETED") {
        refreshAssignment();
        toast.success("AI Generation Complete!");
        addNotification({
          type: "success",
          title: "Assignment ready",
          message: "The assignment finished generating.",
        });
      }
    };

    // C. Listener for the PDF Generation Status
    const handlePdfUpdate = (data: {
      assignmentId: string;
      pdfStatus: AssignmentDetails["pdfStatus"];
      pdfUrl?: string;
    }) => {
      if (data.assignmentId !== assignmentId) return;

      setAssignment((prev) =>
        prev
          ? {
              ...prev,
              pdfStatus: data.pdfStatus,
              pdfUrl: data.pdfUrl || prev.pdfUrl,
            }
          : prev,
      );

      if (data.pdfStatus === "PROCESSING") {
        toast("Generating PDF...", { icon: "⏳" });
        addNotification({
          type: "info",
          title: "PDF processing",
          message: "The PDF is being created.",
        });
      }

      if (data.pdfStatus === "COMPLETED" && data.pdfUrl) {
        setIsDownloading(false);
        toast.success("PDF is ready!");
        addNotification({
          type: "success",
          title: "PDF ready",
          message: "Your PDF is ready to download.",
        });
        // Automatically open the PDF in a new tab for the user
        window.open(data.pdfUrl, "_blank");
      } else if (data.pdfStatus === "FAILED") {
        setIsDownloading(false);
        toast.error("PDF generation failed.");
        addNotification({
          type: "error",
          title: "PDF failed",
          message: "The PDF could not be generated.",
        });
      }
    };

    // D. Attach listeners
    socket.on("assignment-status-update", handleAiUpdate);
    socket.on("pdf-status-update", handlePdfUpdate);

    // E. Cleanup
    return () => {
      socket.off("assignment-status-update", handleAiUpdate);
      socket.off("pdf-status-update", handlePdfUpdate);
    };
  }, [socket, assignmentId, router, refreshAssignment]);

  useEffect(() => {
    if (!assignmentId) return;

    refreshAssignment();
  }, [assignmentId, refreshAssignment]);

  // Handle PDF Download Trigger
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await assignmentService.downloadPdf(assignmentId);

      if (response.pdfUrl) {
        // If it's already generated, open it in a new tab to download
        setAssignment((prev) =>
          prev
            ? { ...prev, pdfStatus: "COMPLETED", pdfUrl: response.pdfUrl }
            : prev,
        );
        window.open(response.pdfUrl, "_blank");
        toast.success("Downloading PDF...");
        addNotification({
          type: "success",
          title: "PDF download started",
          message: "The PDF was opened in a new tab.",
        });
      } else {
        // If it was just pushed to the queue
        toast.success(
          "PDF generation started! Please check back in a few seconds.",
        );
        addNotification({
          type: "info",
          title: "PDF queued",
          message: "PDF generation has started.",
        });
        refreshAssignment(); // Refresh to update status badges
      }
    } catch {
      toast.error("Failed to generate PDF");
      addNotification({
        type: "error",
        title: "PDF request failed",
        message: "We couldn't start the PDF generation.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle AI Regeneration
  const handleRegenerate = async () => {
    const confirm = window.confirm(
      "This will erase the current paper and generate a new one. Continue?",
    );
    if (!confirm) return;

    setIsRegenerating(true);
    try {
      await assignmentService.regenerate(assignmentId);
      toast.success("Regeneration started. AI is generating a new paper...");
      addNotification({
        type: "info",
        title: "Regeneration started",
        message: "A new assignment paper is being generated.",
      });
      refreshAssignment(); // Refresh to show processing state
    } catch {
      toast.error("Failed to start regeneration.");
      addNotification({
        type: "error",
        title: "Regeneration failed",
        message: "We couldn't start the regeneration.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const reviewHtml = assignment ? buildReviewHtml(assignment) : "";

  // Helper to color-code difficulty tags
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-700 border-green-200";
      case "moderate":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "challenging":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-gray-500 font-medium">Loading paper...</p>
      </div>
    );
  }

  if (!assignment) return null;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* 1. Header Card (Metadata & Actions) */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {assignment.className} • {assignment.subject}
            </span>
            {assignment.status === "PROCESSING" && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin" /> AI Generating
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {assignment.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {assignment.timeAllowed} Mins
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />{" "}
              {assignment.generatedPaper?.totalMarks || 0} Marks
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:min-w-fit">
          <button
            onClick={() => setIsReviewOpen(true)}
            disabled={!assignment.generatedPaper}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm text-sm"
          >
            <Eye className="w-4 h-4" />
            Review
          </button>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || assignment.status === "PROCESSING"}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm text-sm"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Regenerate
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading || assignment.status !== "COMPLETED"}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1c1c1e] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-md text-sm"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-orange-500" />
            )}
            {assignment.pdfStatus === "PENDING" ||
            assignment.pdfStatus === "PROCESSING"
              ? "Generating PDF..."
              : "Download PDF"}
          </button>
        </div>
      </div>

      {/* 2. Content Area (Depending on Status) */}

      {assignment.status === "PROCESSING" ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-100">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-blue-50 border-4 border-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            VedaAI is crafting your paper
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
            Analyzing your parameters and generating high-quality questions.
            This usually takes about 5 to 10 seconds.
          </p>
        </div>
      ) : assignment.status === "FAILED" ? (
        <div className="bg-red-50 rounded-2xl p-12 text-center border border-red-100 flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">
            Generation Failed
          </h3>
          <p className="text-red-700 text-sm max-w-md mx-auto">
            The AI encountered an error while building this assignment. Please
            try regenerating it or creating a new one.
          </p>
        </div>
      ) : assignment.generatedPaper ? (
        /* THE GENERATED QUESTION PAPER */
        <div className="space-y-6">
          {/* Loop through sections */}
          {assignment.generatedPaper.sections.map((section, sIdx) => (
            <div
              key={sIdx}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100"
            >
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  {section.title}
                </h2>
                {section.instructions && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    {section.instructions}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                {section.questions.map((q, qIdx) => (
                  <div key={qIdx} className="flex gap-4">
                    <span className="text-lg font-bold text-gray-400 w-6 shrink-0">
                      {qIdx + 1}.
                    </span>
                    <div className="flex-1 space-y-3">
                      {/* Question Text & Badges */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getDifficultyColor(q.difficulty)}`}
                          >
                            {q.difficulty}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-gray-50 border-gray-200 text-gray-600 uppercase tracking-wider">
                            {q.marks} Marks
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {q.text}
                        </p>
                      </div>

                      {/* Answer Key Box */}
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1 block">
                            Answer Key
                          </span>
                          <p className="text-sm text-green-900 leading-relaxed">
                            {q.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {isReviewOpen && assignment.generatedPaper && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 px-3 py-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-gray-900">PDF Review</p>
                <p className="text-xs text-gray-500">
                  Preview the generated paper before download
                </p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100"
                aria-label="Close review"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-[#f3f3f4] p-3 md:p-6">
              <div className="h-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-inner">
                <iframe
                  title="Assignment review preview"
                  className="h-full w-full"
                  srcDoc={reviewHtml}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
