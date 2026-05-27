"use client";

import { useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { assignmentService } from "@/services/assignment.service";
import { useNotificationStore } from "@/store/useNotificationStore";

// Define the structure for our question rows
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

export default function CreateAssignmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Backend Required Fields (Added cleanly to match design)
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [timeAllowed, setTimeAllowed] = useState<number>(45);

  // Question Configuration State (Default matching Figma)
  const [questions, setQuestions] = useState<QuestionRow[]>([
    { id: "1", type: "Multiple Choice Questions", count: 4, marks: 1 },
    { id: "2", type: "Short Questions", count: 3, marks: 2 },
  ]);

  // Derived totals
  const totalQuestions = useMemo(
    () => questions.reduce((sum, q) => sum + q.count, 0),
    [questions],
  );
  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + q.count * q.marks, 0),
    [questions],
  );

  // Handlers for Question Rows
  const addQuestionRow = () => {
    setQuestions([
      ...questions,
      { id: Date.now().toString(), type: "", count: 1, marks: 1 },
    ]);
  };

  const removeQuestionRow = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (
    id: string,
    field: keyof QuestionRow,
    value: string | number,
  ) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const updateCounter = (
    id: string,
    field: "count" | "marks",
    increment: boolean,
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const currentValue = q[field];
          const newValue = increment
            ? currentValue + 1
            : Math.max(1, currentValue - 1);
          return { ...q, [field]: newValue };
        }
        return q;
      }),
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Submission handler
  const handleSubmit = async () => {
    if (!title || !subject || !className || !dueDate) {
      addNotification({
        type: "warning",
        title: "Missing required fields",
        message: "Please fill in all required assignment details.",
      });
      return toast.error(
        "Please fill in all required fields (Title, Subject, Class, Date)",
      );
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subject", subject);
      formData.append("className", className);
      formData.append("timeAllowed", timeAllowed.toString());
      formData.append("dueDate", new Date(dueDate).toISOString());
      if (additionalInfo)
        formData.append("additionalInstructions", additionalInfo);
      if (file) formData.append("file", file);

      // Map our frontend state to the backend schema
      const formattedConfig = questions.map((q) => ({
        questionType: q.type,
        count: q.count,
        marks: q.marks,
      }));
      formData.append("questionConfig", JSON.stringify(formattedConfig));

      await assignmentService.create(formData);

      toast.success("Assignment sent for AI Generation!");
      addNotification({
        type: "success",
        title: "Assignment created",
        message: "Your assignment was sent for AI generation.",
      });
      router.push("/assignments");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(message || "Failed to create assignment");
      addNotification({
        type: "error",
        title: "Create failed",
        message: message || "Failed to create assignment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-10">
      {/* Header & Progress Bar */}
      <div className="mb-8 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_14px_50px_-30px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-[0_0_0_6px_rgba(34,197,94,0.12)]"></span>
          Create Assignment
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-4">
          Set up a new assignment for your students
        </p>

        {/* Progress Line */}
        <div className="flex gap-2 mt-6 ml-4">
          <div className="h-1 bg-gray-800 rounded-full w-1/2"></div>
          <div className="h-1 bg-gray-200 rounded-full w-1/2"></div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[28px] p-5 md:p-8 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.35)] border border-white/80">
        <h2 className="text-xl font-bold text-gray-900">Assignment Details</h2>
        <p className="text-sm text-gray-500 mb-6">
          Basic information about your assignment
        </p>

        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors mb-6"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.pdf"
          />
          <UploadCloud className="w-8 h-8 text-gray-800 mb-3" />
          <p className="text-sm font-semibold text-gray-900">
            {file ? file.name : "Choose a file or drag & drop it here"}
          </p>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            JPEG, PNG, upto 10MB
          </p>
          <button className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Browse Files
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center -mt-4 mb-8">
          Upload images of your preferred document/image
        </p>

        {/* Basic Info (Mapped for Backend) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Assignment Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="e.g. Physics Quiz"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Subject & Class
            </label>
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

        {/* Due Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Due Date
            </label>
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
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Time Allowed (Mins)
            </label>
            <input
              type="number"
              value={timeAllowed}
              onChange={(e) => setTimeAllowed(parseInt(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
        </div>

        {/* Question Type Headers */}
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_120px_28px] items-center text-sm font-bold text-gray-900 mb-3 px-1 gap-3">
          <div>Question Type</div>
          <div className="text-center">No. of Questions</div>
          <div className="text-center">Marks</div>
          <div></div>
        </div>

        {/* Dynamic Question Rows */}
        <div className="space-y-3 mb-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px_28px] items-center gap-3"
            >
              <div className="flex-1">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, "type", e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none appearance-none"
                >
                  <option value="" disabled>
                    Select Type
                  </option>
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {/* Question Counter */}
              <div className="w-32 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <button
                  type="button"
                  onClick={() => updateCounter(q.id, "count", false)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Minus className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-sm font-bold w-6 text-center">
                  {q.count}
                </span>
                <button
                  type="button"
                  onClick={() => updateCounter(q.id, "count", true)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Marks Counter */}
              <div className="w-24 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 relative">
                <button
                  type="button"
                  onClick={() => updateCounter(q.id, "marks", false)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Minus className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-sm font-bold w-4 text-center">
                  {q.marks}
                </span>
                <button
                  type="button"
                  onClick={() => updateCounter(q.id, "marks", true)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>

                {/* Delete button (shows outside the box if more than 1 row exists) */}
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

        {/* Add Row Button & Totals */}
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

        {/* Additional Info */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Additional Information (For better output)
          </label>
          <div className="relative">
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
              placeholder="e.g Generate a question paper for 3 hour exam duration.."
            />
            <button className="absolute right-3 bottom-3 p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-900 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4">
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
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Next"
            )}
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
