import { Queue } from "bullmq";
import { redis } from "../config/redis";


export const pdfQueue = new Queue("pdf-generation", {
  connection: redis,
});

export const addPdfJob = async (assignmentId: string) => {
  return await pdfQueue.add(
    "generate-pdf",
    { assignmentId },
    {
      jobId: `pdf-${assignmentId}-${Date.now()}`, 
      attempts: 2,
    }
  );
};