"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  UploadCloud,
  Calendar,
  Plus,
  Minus,
  X,
  Mic,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { assignmentService } from "@/services/assignment.service";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/store/useAuthStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";

interface QuestionRow {
  id: string;
  type: string;
  count: number;
  marks: number;
}

const QUESTION_TYPES = [
  "Multiple Choice Questions",
  "Short Questions",
  "Long Answer Questions",
  "Very Short Questions",
  "True / False",
  "Fill in the Blanks",
  "Assertion - Reason",
  "Case Study Based Questions",
  "Numerical Problems",
  "Diagram / Graph Based Questions",
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function CreateAssignmentPage() {
  const router = useRouter();
  const socket = useSocket();
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const incrementCount = useAssignmentStore((state) => state.incrementCount);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null);
  const createdAssignmentIdRef = useRef<string | null>(null);

  const [generationStatus, setGenerationStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED">("PENDING");
  const [pdfStatus, setPdfStatus] = useState<"NONE" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED">("NONE");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatedPaper, setGeneratedPaper] = useState<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [timeAllowed, setTimeAllowed] = useState<number>(45);

  const [questions, setQuestions] = useState<QuestionRow[]>([
    { id: "1", type: "Multiple Choice Questions", count: 4, marks: 1 },
    { id: "2", type: "Short Questions", count: 3, marks: 2 },
  ]);

  const totalQuestions = useMemo(() => questions.reduce((sum, q) => sum + q.count, 0), [questions]);
  const totalMarks = useMemo(() => questions.reduce((sum, q) => sum + q.count * q.marks, 0), [questions]);

  const addQuestionRow = () =>
    setQuestions([...questions, { id: Date.now().toString(), type: "", count: 1, marks: 1 }]);

  const removeQuestionRow = (id: string) =>
    setQuestions(questions.filter((q) => q.id !== id));

  const updateQuestion = (id: string, field: keyof QuestionRow, value: string | number) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));

  const updateCounter = (id: string, field: "count" | "marks", increment: boolean) =>
    setQuestions(
      questions.map((q) => {
        if (q.id !== id) return q;
        const newValue = increment ? q[field] + 1 : Math.max(1, q[field] - 1);
        return { ...q, [field]: newValue };
      })
    );

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      toast.success("Voice input stopped");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice typing is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    const baseText = additionalInfo.trim() ? additionalInfo.trim() + " " : "";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAdditionalInfo(baseText + transcript);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === "not-allowed") toast.error("Microphone access denied.");
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
    setIsRecording(true);
    recognitionRef.current = recognition;
    toast("Listening...", { icon: "🎙️" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const checkAssignmentStatus = useCallback(() => {
    if (!createdAssignmentIdRef.current) return;
    assignmentService
      .getById(createdAssignmentIdRef.current)
      .then((response) => {
        const assignment = response.assignment;
        setGenerationStatus(assignment.status);
        setPdfStatus(assignment.pdfStatus);
        if (assignment.pdfUrl) setPdfUrl(assignment.pdfUrl);
        if (assignment.status === "COMPLETED" && assignment.generatedPaper) {
          setGeneratedPaper(assignment.generatedPaper);
          setStep(3);
        }
      })
      .catch(() => console.error("Failed to check status"));
  }, []);

  useEffect(() => {
    if (!createdAssignmentId || step === 1) return;

    checkAssignmentStatus();

    const pollInterval = setInterval(() => {
      if (step === 2 || (step === 3 && pdfStatus !== "COMPLETED" && pdfStatus !== "FAILED")) {
        checkAssignmentStatus();
      }
    }, 3000);

    if (!socket) return () => clearInterval(pollInterval);

    socket.emit("join-assignment", createdAssignmentId);

    const handleAiUpdate = (data: { assignmentId: string; status: any }) => {
      if (data.assignmentId !== createdAssignmentIdRef.current) return;

      if (data.status === "COMPLETED") {
        toast.success("AI Generation Complete!");
        addNotification({ type: "success", title: "Assignment ready", message: "The assignment finished generating." });
        checkAssignmentStatus();
      } else {
        setGenerationStatus(data.status);
      }
    };

    const handlePdfUpdate = (data: { assignmentId: string; pdfStatus: any; pdfUrl?: string }) => {
      if (data.assignmentId !== createdAssignmentIdRef.current) return;

      setPdfStatus(data.pdfStatus);
      if (data.pdfUrl) setPdfUrl(data.pdfUrl);

      if (data.pdfStatus === "PROCESSING") {
        toast("Generating PDF...", { icon: "⏳" });
        addNotification({ type: "info", title: "PDF processing", message: "The PDF is being created." });
      } else if (data.pdfStatus === "COMPLETED" && data.pdfUrl) {
        toast.success("PDF is ready!");
        addNotification({ type: "success", title: "PDF ready", message: "Your PDF is ready to download." });
        window.open(data.pdfUrl, "_blank");
      } else if (data.pdfStatus === "FAILED") {
        toast.error("PDF generation failed.");
        addNotification({ type: "error", title: "PDF failed", message: "The PDF could not be generated." });
      }
    };

    socket.on("assignment-status-update", handleAiUpdate);
    socket.on("pdf-status-update", handlePdfUpdate);

    return () => {
      clearInterval(pollInterval);
      socket.off("assignment-status-update", handleAiUpdate);
      socket.off("pdf-status-update", handlePdfUpdate);
    };
  }, [socket, createdAssignmentId, step, pdfStatus, checkAssignmentStatus, addNotification]);

  const handleSubmit = async () => {
    if (!title || !subject || !className || !dueDate) {
      addNotification({ type: "warning", title: "Missing fields", message: "Please fill in all required details." });
      return toast.error("Please fill in all required fields");
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subject", subject);
      formData.append("className", className);
      formData.append("timeAllowed", timeAllowed.toString());
      formData.append("dueDate", new Date(dueDate).toISOString());
      if (additionalInfo) formData.append("additionalInstructions", additionalInfo);
      if (file) formData.append("file", file);

      const formattedConfig = questions.map((q) => ({
        questionType: q.type,
        count: q.count,
        marks: q.marks,
      }));
      formData.append("questionConfig", JSON.stringify(formattedConfig));

      const response = await assignmentService.create(formData);
      incrementCount();
      toast.success("Assignment sent for AI Generation!");

      createdAssignmentIdRef.current = response.assignmentId;
      setCreatedAssignmentId(response.assignmentId);
      setGenerationStatus("PROCESSING");
      setStep(2);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast.error(message || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfUrl && pdfStatus === "COMPLETED") {
      window.open(pdfUrl, "_blank");
      toast.success("Downloading PDF...");
      return;
    }

    try {
      setPdfStatus("PROCESSING");
      const response = await assignmentService.downloadPdf(createdAssignmentId!);

      if (response.pdfUrl) {
        setPdfUrl(response.pdfUrl);
        setPdfStatus("COMPLETED");
        window.open(response.pdfUrl, "_blank");
        toast.success("Downloading PDF...");
      } else {
        toast.success("PDF generation started! Please wait.");
        addNotification({ type: "info", title: "PDF queued", message: "PDF generation has started." });
        checkAssignmentStatus();
      }
    } catch {
      setPdfStatus("FAILED");
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-10">

      {step !== 3 && (
        <div className="mb-8 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_14px_50px_-30px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-in fade-in">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-[0_0_0_6px_rgba(34,197,94,0.12)]"></span>
            {step === 1 ? "Create Assignment" : "Generating Assignment"}
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-4">
            {step === 1 ? "Set up a new assignment for your students" : "AI is crafting your paper. Please wait..."}
          </p>
          <div className="flex gap-2 mt-6 ml-4">
            <div className="h-1 bg-gray-800 rounded-full w-1/2 transition-all duration-500"></div>
            <div className={`h-1 rounded-full w-1/2 transition-all duration-500 ${step === 2 ? "bg-gray-800" : "bg-gray-200"}`}></div>
          </div>
        </div>
      )}

      {step !== 3 && (
        <div className="bg-white rounded-[28px] p-5 md:p-8 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.35)] border border-white/80">

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900">Assignment Details</h2>
              <p className="text-sm text-gray-500 mb-6">Basic information about your assignment</p>

              <div
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors mb-6"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" />
                <UploadCloud className="w-8 h-8 text-gray-800 mb-3" />
                <p className="text-sm font-semibold text-gray-900">{file ? file.name : "Choose a file or drag & drop it here"}</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">JPEG, PNG, upto 10MB</p>
                <button className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Browse Files</button>
              </div>
              <p className="text-xs text-gray-400 text-center -mt-4 mb-8">Upload images of your preferred document/image</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Assignment Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="e.g. Physics Quiz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Subject & Class</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-1/2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="Subject"
                    />
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-1/2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="Class"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Due Date</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                    <Calendar className="w-5 h-5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Time Allowed (Mins)</label>
                  <input
                    type="number"
                    value={timeAllowed}
                    onChange={(e) => setTimeAllowed(parseInt(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              </div>

              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_120px_28px] items-center text-sm font-bold text-gray-900 mb-3 px-1 gap-3">
                <div>Question Type</div>
                <div className="text-center">No. of Questions</div>
                <div className="text-center">Marks</div>
                <div></div>
              </div>

              <div className="space-y-3 mb-4">
                {questions.map((q) => (
                  <div key={q.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px_28px] items-center gap-3">
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, "type", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none appearance-none"
                    >
                      <option value="" disabled>Select Type</option>
                      {QUESTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <div className="w-32 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <button type="button" onClick={() => updateCounter(q.id, "count", false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                        <Minus className="w-4 h-4 text-gray-500" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{q.count}</span>
                      <button type="button" onClick={() => updateCounter(q.id, "count", true)} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                        <Plus className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="w-24 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <button type="button" onClick={() => updateCounter(q.id, "marks", false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                        <Minus className="w-4 h-4 text-gray-500" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{q.marks}</span>
                      <button type="button" onClick={() => updateCounter(q.id, "marks", true)} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                        <Plus className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestionRow(q.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors md:justify-self-end"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-start mb-8">
                <button
                  onClick={addQuestionRow}
                  className="flex items-center gap-2 text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Question Type
                </button>
                <div className="text-right text-sm font-bold text-gray-900">
                  <p>Total Questions : {totalQuestions}</p>
                  <p>Total Marks : {totalMarks}</p>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-900 mb-2">Additional Information (For better output)</label>
                <div className="relative">
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                    placeholder="e.g Generate a question paper for 3 hour exam duration.."
                  />
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`absolute right-3 bottom-3 p-2 rounded-full shadow-sm transition-colors ${
                      isRecording
                        ? "bg-red-50 text-red-500 animate-pulse border border-red-200"
                        : "bg-white text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-[#1c1c1e] text-white rounded-full text-sm font-bold hover:bg-black transition-colors disabled:opacity-70 shadow-lg"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in zoom-in-95 duration-500 min-h-[400px]">
              {(generationStatus === "PENDING" || generationStatus === "PROCESSING") && (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-blue-50 border-4 border-blue-100 rounded-full flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">VedaAI is crafting your paper</h3>
                  <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                    Analyzing your parameters and formatting the document. Please wait...
                  </p>
                </div>
              )}
              {generationStatus === "FAILED" && (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                  <h3 className="text-xl font-bold text-red-900 mb-2">Generation Failed</h3>
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-full transition-colors text-sm"
                  >
                    Go Back & Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 3 && generatedPaper && (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">

          <div className="bg-[#262626] rounded-[24px] p-6 md:p-8 text-white shadow-md">
            <h3 className="text-[16px] md:text-[18px] font-bold mb-6 leading-relaxed">
              Certainly, {user?.name?.split(" ")[0] || "Teacher"}! Here are customized Question Paper for your {className} {subject} classes:
            </h3>

            <button
              onClick={handleDownloadPdf}
              disabled={pdfStatus === "PENDING" || pdfStatus === "PROCESSING"}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-full text-sm hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-70"
            >
              {pdfStatus === "PENDING" || pdfStatus === "PROCESSING" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {pdfStatus === "COMPLETED" ? "Download as PDF" : "Generate PDF"}
                </>
              )}
            </button>
          </div>

          <div className="border border-gray-200 rounded-[24px] p-8 md:p-14 bg-white shadow-sm font-sans text-gray-900">
            <div className="text-center space-y-1 mb-10">
              <div className="text-2xl md:text-[28px] font-bold">{user?.school || "Your School Name"}</div>
              <div className="text-[18px] font-bold mt-2">Subject: {subject}</div>
              <div className="text-[18px] font-bold">Class: {className}</div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between font-bold mb-8 text-[15px]">
              <span>Time Allowed: {timeAllowed} minutes</span>
              <span>Maximum Marks: {totalMarks}</span>
            </div>

            <div className="font-bold mb-8 text-[15px]">All questions are compulsory unless stated otherwise.</div>

            <div className="space-y-3 mb-12 text-[15px] font-bold">
              <p>Name: ________________________</p>
              <p>Roll Number: _________________</p>
              <p>Class: {className} Section: ________</p>
            </div>

            {generatedPaper.sections?.map((section: any, sIdx: number) => (
              <div key={sIdx} className="mb-10 text-[14px]">
                <div className="text-center text-[18px] font-bold mt-8 mb-6">{section.title}</div>
                {section.type && <div className="font-bold mb-1 text-[15px]">{section.type}</div>}
                {section.instructions && <div className="italic mb-4 text-gray-700">{section.instructions}</div>}
                <ol className="list-decimal pl-5 space-y-4 text-[14px]">
                  {section.questions.map((q: any, qIdx: number) => (
                    <li key={qIdx} className="pl-2 leading-relaxed">
                      {q.difficulty ? `[${q.difficulty}] ` : ""}{q.text}{" "}
                      <span className="font-normal">[{q.marks} Marks]</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}

            <div className="font-bold mt-12 mb-12 text-[15px]">End of Question Paper</div>

            <div className="pt-4">
              <div className="text-[18px] font-bold mb-6">Answer Key:</div>
              <ol className="list-decimal pl-5 space-y-5 text-[14px]">
                {generatedPaper.sections
                  ?.flatMap((s: any) => s.questions)
                  .map((q: any, idx: number) => (
                    <li key={`ans-${idx}`} className="pl-2 leading-relaxed">
                      <span dangerouslySetInnerHTML={{ __html: escapeHtml(q.answer).replace(/\n/g, "<br/>") }} />
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}