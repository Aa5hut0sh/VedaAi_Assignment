import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import Assignment from "../models/assignment.model";
import { generateQuestionPaper } from "../services/llm.service";
import { getIo } from "../sockets/socket";

export const generationWorker = new Worker(
  "assignment-generation",
  async (job: Job) => {
    const {
      assignmentId,
      subject,
      className,
      timeAllowed,
      questionConfig,
      additionalInstructions,
      materialPath,
    } = job.data;

    console.log(`[Worker] Processing job for Assignment: ${assignmentId}`);

    try {
      await Assignment.findByIdAndUpdate(assignmentId, {
        status: "PROCESSING",
      });

      const io = getIo();
      io.to(assignmentId).emit("assignment-status-update", {
        assignmentId,
        status: "PROCESSING",
      });

      //LLM call

      const generatedPaper = await generateQuestionPaper({
        subject,
        className,
        timeAllowed,
        questionConfig,
        additionalInstructions,
        materialPath,
      });

      await Assignment.findByIdAndUpdate(assignmentId, {
        status: "COMPLETED",
        generatedPaper: generatedPaper,
      });


      io.to(assignmentId).emit("assignment-status-update", {
        assignmentId,
        status: "COMPLETED",
      });

      console.log(`[Worker] Job ${assignmentId} completed successfully.`);
    } catch (error: any) {
      console.error(`[Worker] Job ${assignmentId} failed:`, error.message);

      await Assignment.findByIdAndUpdate(assignmentId, {
        status: "FAILED",
        jobError: error.message,
      });

      const io = getIo();
      io.to(assignmentId).emit("assignment-status-update", {
        assignmentId,
        status: "FAILED",
        error: error.message,
      });

      throw error;
    }
  },
  { connection: redis },
);

generationWorker.on("completed", (job) => {
  console.log(`Job ${job?.id} has completed`);
});

generationWorker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} failed with error: ${err.message}`);
});
