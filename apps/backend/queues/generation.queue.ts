import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const generationQueue = new Queue("assignment-generation", {
  connection: redis,
});


export const addGenerationJob = async (jobId: string, payload: any) => {
  return await generationQueue.add(
    "generate-paper", 
    payload ,
    {
      jobId: jobId, 
      attempts: 3,         
      backoff: {
        type: "exponential",
        delay: 2000,      
      },
    }
  );
};