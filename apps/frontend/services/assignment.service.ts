import api from "../lib/api";

// Optional: Define types for better IntelliSense in your UI components
export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  className: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pdfStatus: "NONE" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pdfUrl?: string;
  createdAt: string;
  dueDate: string;
  questionConfig?: Array<{
    questionType: string;
    count: number;
    marks: number;
  }>;
  generatedPaper?: {
    totalMarks?: number;
    totalQuestions?: number;
  };
}

export const assignmentService = {
  // 1. Create Assignment (Requires FormData for File Upload)
  create: async (formData: FormData) => {
    const response = await api.post("/assignments/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // 2. Get all assignments for the logged-in teacher
  getAll: async (): Promise<{
    success: boolean;
    assignments: Assignment[];
  }> => {
    const response = await api.get("/assignments/all");
    return response.data;
  },

  // 3. Get a specific assignment by ID (Includes the full AI generated paper)
  getById: async (id: string) => {
    const response = await api.get(`/assignments/${id}`);
    return response.data;
  },

  // 4. Delete an assignment
  delete: async (id: string) => {
    const response = await api.delete(`/assignments/${id}`);
    return response.data;
  },

  // 5. Regenerate an existing assignment
  regenerate: async (id: string) => {
    const response = await api.post(`/assignments/${id}/regenerate`);
    return response.data;
  },

  // 6. Trigger or Fetch the PDF Download
  downloadPdf: async (id: string) => {
    const response = await api.get(`/assignments/${id}/download`);
    return response.data;
  },

  // 7. ADMIN ONLY: Get all platform assignments
  getAllAdmin: async () => {
    const response = await api.get("/assignments/all-admin");
    return response.data;
  },
};
