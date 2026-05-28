import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import Assignment from "../models/assignment.model";
import { getIo } from "../sockets/socket";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import cloudinary from "../config/cloudinary.config.ts";

export const pdfWorker = new Worker(
  "pdf-generation",
  async (job: Job) => {
    const { assignmentId } = job.data;
    console.log(`[Worker] Starting PDF generation for Assignment: ${assignmentId}`);

    try {

      await Assignment.findByIdAndUpdate(assignmentId, { pdfStatus: "PROCESSING" });
      const io = getIo();
      io.to(assignmentId).emit("pdf-status-update", { assignmentId, pdfStatus: "PROCESSING" });

      const assignment = await Assignment.findById(assignmentId).populate("teacherId", "school");
      if (!assignment || !assignment.generatedPaper) {
        throw new Error("Missing generated paper data");
      }

      const schoolName = (assignment.teacherId as any)?.school || "School Name Not Set";

      // 1. Build the Header and Student Info section
      let htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; font-size: 14px; }
              .text-center { text-align: center; }
              .header-school { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
              .header-sub { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
              .flex-between { display: flex; justify-content: space-between; font-weight: bold; margin-top: 30px; margin-bottom: 20px; }
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
              <div class="header-school">${schoolName}</div>
              <div class="header-sub">Subject: ${assignment.subject}</div>
              <div class="header-sub">Class: ${assignment.className}</div>
            </div>

            <div class="flex-between">
              <span>Time Allowed: ${assignment.timeAllowed} minutes</span>
              <span>Maximum Marks: ${assignment.generatedPaper.totalMarks}</span>
            </div>

            <div class="compulsory-text">All questions are compulsory unless stated otherwise.</div>

            <div class="student-info">
              <p>Name: __________________________</p>
              <p>Roll Number: ___________________</p>
              <p>Class: ${assignment.className} Section: ________</p>
            </div>
      `;

      // 2. Loop through sections to build the QUESTIONS
      let answerKeyHtml = `<div class="end-paper">End of Question Paper</div>
                           <div class="answer-key-header">Answer Key:</div>
                           <ol class="answer-list">`;

      assignment.generatedPaper.sections.forEach((section: any) => {
        // Add Section Header
        htmlContent += `
          <div class="section-title">${section.title}</div>
          <div class="instructions">${section.instructions}</div>
          <ol class="question-list">
        `;
        
        section.questions.forEach((q: any) => {
          // Add Question to Main Paper
          htmlContent += `
            <li class="question-item">
              [${q.difficulty}] ${q.text} [${q.marks} Marks]
            </li>
          `;
          
          // Simultaneously add Answer to the Answer Key string
          answerKeyHtml += `
            <li class="answer-item">${q.answer}</li>
          `;
        });
        
        htmlContent += `</ol>`;
      });

      answerKeyHtml += `</ol>`; // Close answer list

      // 3. Append the Answer Key to the bottom of the document
      htmlContent += answerKeyHtml;
      htmlContent += `</body></html>`;


      const pdfDir = path.join(__dirname, "../uploads/pdfs");
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const pdfPath = path.join(pdfDir, `${assignmentId}.pdf`);


      const browser = await puppeteer.launch({ 
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          
          "--disable-dev-shm-usage",
          "--single-process",
          "--no-zygote"
        ],
       });
      const page = await browser.newPage();
      await page.setContent(htmlContent);

      const localTempPath = path.join(__dirname, `../uploads/temp-${assignmentId}.pdf`);
      await page.pdf({ path: localTempPath, format: "A4", printBackground: true });
      await browser.close();

      try {

        console.log("Cloudinary Runtime Config:", cloudinary.config());

        const uploadResult = await cloudinary.uploader.upload(localTempPath, {
            folder: "veda-ai/assignments",
            resource_type: "raw",
            type: "upload",
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        await Assignment.findByIdAndUpdate(assignmentId, { 
          pdfStatus: "COMPLETED", 
          pdfUrl: uploadResult.secure_url,
        });

        io.to(assignmentId).emit("pdf-status-update", { 
          assignmentId, 
          pdfStatus: "COMPLETED", 
          pdfUrl: uploadResult.secure_url,
        });

        console.log(`[Worker] PDF successfully created at ${pdfPath}`);
      } catch (error: any) {
        console.error(`[Worker] PDF generation failed:`, error.message);
        
        await Assignment.findByIdAndUpdate(assignmentId, { pdfStatus: "FAILED" });
        io.to(assignmentId).emit("pdf-status-update", { assignmentId, pdfStatus: "FAILED" });
        
        throw error;
      } finally {
        // Clean up temp file if it exists
        if (fs.existsSync(localTempPath)) {
          fs.unlinkSync(localTempPath);
        }
      }
    } catch (error: any) {
      console.error(`[Worker] PDF generation failed:`, error.message);
      
      await Assignment.findByIdAndUpdate(assignmentId, { pdfStatus: "FAILED" });
      const io = getIo();
      io.to(assignmentId).emit("pdf-status-update", { assignmentId, pdfStatus: "FAILED" });
      
      throw error;
    }
  },
  { connection: redis }
);

pdfWorker.on("completed", (job) => console.log(`PDF Job ${job?.id} completed`));
pdfWorker.on("failed", (job, err) => console.log(`PDF Job ${job?.id} failed: ${err.message}`));