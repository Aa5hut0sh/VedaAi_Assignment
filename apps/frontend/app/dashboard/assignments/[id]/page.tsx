"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, Clock, Download, RefreshCw, 
  CheckCircle, Loader2, AlertTriangle, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import { assignmentService } from "@/services/assignment.service";
import { useSocket } from "@/hooks/useSocket";

export default function ViewAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
    const socket = useSocket();

  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch the assignment details
  const fetchAssignment = async () => {
    try {
      const response = await assignmentService.getById(assignmentId);
      setAssignment(response.assignment);
    } catch (error) {
      toast.error("Failed to load assignment details");
      router.push("/dashboard/assignments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !assignmentId) return;

    // A. Join the specific room for this assignment
    socket.emit("join-assignment", assignmentId);

    // B. Listener for the AI Generation Status
    const handleAiUpdate = (data: { assignmentId: string; status: string }) => {
      if (data.assignmentId !== assignmentId) return;
      
      setAssignment((prev: any) => ({ ...prev, status: data.status }));
      
      // If it finished, we need to fetch from the DB to get the actual JSON paper payload
      if (data.status === "COMPLETED") {
        fetchAssignment();
        toast.success("AI Generation Complete!");
      }
    };

    // C. Listener for the PDF Generation Status
    const handlePdfUpdate = (data: { assignmentId: string; pdfStatus: string; pdfUrl?: string }) => {
      if (data.assignmentId !== assignmentId) return;

      setAssignment((prev: any) => ({ 
        ...prev, 
        pdfStatus: data.pdfStatus, 
        pdfUrl: data.pdfUrl || prev.pdfUrl 
      }));

      if (data.pdfStatus === "COMPLETED" && data.pdfUrl) {
        setIsDownloading(false);
        toast.success("PDF is ready!");
        // Automatically open the PDF in a new tab for the user
        window.open(`http://localhost:3001${data.pdfUrl}`, "_blank");
      } else if (data.pdfStatus === "FAILED") {
        setIsDownloading(false);
        toast.error("PDF generation failed.");
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
  }, [socket, assignmentId]);

  useEffect(() => {
    if (assignmentId) fetchAssignment();
  }, [assignmentId]);

  // Handle PDF Download Trigger
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await assignmentService.downloadPdf(assignmentId);
      
      if (response.pdfUrl) {
        // If it's already generated, open it in a new tab to download
        window.open(`http://localhost:3001${response.pdfUrl}`, "_blank");
        toast.success("Downloading PDF...");
      } else {
        // If it was just pushed to the queue
        toast.success("PDF generation started! Please check back in a few seconds.");
        fetchAssignment(); // Refresh to update status badges
      }
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle AI Regeneration
  const handleRegenerate = async () => {
    const confirm = window.confirm("This will erase the current paper and generate a new one. Continue?");
    if (!confirm) return;

    setIsRegenerating(true);
    try {
      await assignmentService.regenerate(assignmentId);
      toast.success("AI is generating a new paper...");
      fetchAssignment(); // Refresh to show processing state
    } catch (error) {
      toast.error("Failed to start regeneration");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Helper to color-code difficulty tags
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "bg-green-100 text-green-700 border-green-200";
      case "moderate": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "challenging": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
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
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {assignment.timeAllowed} Mins</div>
            <div className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {assignment.generatedPaper?.totalMarks || 0} Marks</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:min-w-fit">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || assignment.status === "PROCESSING"}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm text-sm"
          >
            {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading || assignment.status !== "COMPLETED"}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1c1c1e] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-md text-sm"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-orange-500" />}
            {assignment.pdfStatus === "PENDING" || assignment.pdfStatus === "PROCESSING" 
              ? "Generating PDF..." 
              : "Download PDF"}
          </button>
        </div>
      </div>

      {/* 2. Content Area (Depending on Status) */}
      
      {assignment.status === "PROCESSING" ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-blue-50 border-4 border-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">VedaAI is crafting your paper</h3>
          <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
            Analyzing your parameters and generating high-quality questions. This usually takes about 5 to 10 seconds.
          </p>
        </div>
      ) : assignment.status === "FAILED" ? (
        <div className="bg-red-50 rounded-2xl p-12 text-center border border-red-100 flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">Generation Failed</h3>
          <p className="text-red-700 text-sm max-w-md mx-auto">
            The AI encountered an error while building this assignment. Please try regenerating it or creating a new one.
          </p>
        </div>
      ) : assignment.generatedPaper ? (
        
        /* THE GENERATED QUESTION PAPER */
        <div className="space-y-6">
          
          {/* Loop through sections */}
          {assignment.generatedPaper.sections.map((section: any, sIdx: number) => (
            <div key={sIdx} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                {section.instructions && (
                  <p className="text-sm text-gray-500 mt-2 italic">{section.instructions}</p>
                )}
              </div>

              <div className="space-y-6">
                {section.questions.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="flex gap-4">
                    <span className="text-lg font-bold text-gray-400 w-6 shrink-0">{qIdx + 1}.</span>
                    <div className="flex-1 space-y-3">
                      
                      {/* Question Text & Badges */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getDifficultyColor(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-gray-50 border-gray-200 text-gray-600 uppercase tracking-wider">
                            {q.marks} Marks
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium leading-relaxed">{q.text}</p>
                      </div>

                      {/* Answer Key Box */}
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1 block">Answer Key</span>
                          <p className="text-sm text-green-900 leading-relaxed">{q.answer}</p>
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
    </div>
  );
}