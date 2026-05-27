import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import Assignment from "../models/assignment.model";
import { addGenerationJob } from "../queues/generation.queue";
import { addPdfJob } from "../queues/pdf.queue";
import fs from "fs";
import path from "path";

const createAssignmentSchema = z.object({
  title: z.string().optional(),
  subject: z.string(),
  className: z.string(),
  timeAllowed: z.number(),
  dueDate: z.string().datetime(), 
  questionConfig: z.array(
    z.object({
      questionType: z.string(),
      count: z.number().positive(),
      marks: z.number().positive(),
    })
  ),
  additionalInstructions: z.string().optional(),
});


export const createAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {

    let parsedConfig;

    try {
      parsedConfig = typeof req.body.questionConfig === "string" 
        ? JSON.parse(req.body.questionConfig) 
        : req.body.questionConfig;

    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid questionConfig format" });
    }

    const payload = {
      title: req.body.title,
      subject: req.body.subject,
      className: req.body.className,
      timeAllowed: Number(req.body.timeAllowed),
      dueDate: req.body.dueDate,
      additionalInstructions: req.body.additionalInstructions,
      questionConfig: parsedConfig,
    };

    const parse = createAssignmentSchema.safeParse(payload);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment data",
        errors: parse.error.issues,
      });
    }

    const { title, subject, className, timeAllowed,  dueDate, questionConfig, additionalInstructions } = parse.data;

    const materialPath = req.file ? req.file.path : null;

    const assignment = new Assignment({
      teacherId: req.userId,
      title: title || "Untitled Assignment",
      subject,
      className,
      timeAllowed,
      dueDate,
      questionConfig,
      additionalInstructions,
      materialUrl: materialPath || undefined,
    });

    await assignment.save();


    await addGenerationJob(assignment._id.toString(), {
      assignmentId: assignment._id.toString(),
      subject: assignment.subject,
      className: assignment.className,
      timeAllowed: assignment.timeAllowed,
      questionConfig: assignment.questionConfig,
      additionalInstructions: assignment.additionalInstructions,
      materialPath: assignment.materialUrl || null,
    });

    res.status(202).json({
      success: true,
      message: "Assignment created. AI generation is processing in the background.",
      assignmentId: assignment._id,
      status: assignment.status,
    });
  } catch (err) {
    next(err);
  }
};


export const getAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignments = await Assignment.find({ teacherId: req.userId })
      .select("-generatedPaper")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      assignments,
    });
  } catch (err) {
    next(err);
  }
};


export const getAssignmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.userId, 
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      assignment,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const assignment = await Assignment.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.userId, 
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (assignment.materialUrl && fs.existsSync(assignment.materialUrl)) {
      fs.unlinkSync(assignment.materialUrl); 
    }

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const regenerateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const existingAssignment = await Assignment.findOne({
      _id: req.params.id, 
      teacherId: req.userId
    });

    if (!existingAssignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (existingAssignment.pdfUrl) {
      const pdfPath = path.join(__dirname, "../", existingAssignment.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath); 
      }
    }



    const assignment = await Assignment.findByIdAndUpdate(
      existingAssignment._id,
      { 
        status: "PENDING", 
        jobError: null,
        pdfStatus: "NONE",
        pdfUrl: null,
        $unset: { generatedPaper: 1 } 
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const uniqueJobId = `${assignment._id.toString()}-${Date.now()}`;

    
    await addGenerationJob(uniqueJobId, {
      assignmentId: assignment._id.toString(), 
      subject: assignment.subject,
      className: assignment.className,
      timeAllowed: assignment.timeAllowed,
      questionConfig: assignment.questionConfig,
      additionalInstructions: assignment.additionalInstructions,
      materialPath: assignment.materialUrl || null,
    });

    res.status(200).json({
      success: true,
      message: "Assignment regeneration initiated",
      status: assignment.status
    });
  } catch (err) {
    next(err);
  }
};

export const getAllAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const role = req.role;

    if (role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admins only.",
        });
    }
    
    const assignments = await Assignment.find().sort({ createdAt: -1 }).populate("teacherId", "name email");
    res.status(200).json({
      success: true,
      assignments,
    });
  } catch (err) {
    next(err);
  }
};

export const downloadAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.userId,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (assignment.status !== "COMPLETED" || !assignment.generatedPaper) {
      return res.status(400).json({ success: false, message: "AI paper is not ready yet" });
    }

   
    if (assignment.pdfStatus === "COMPLETED" && assignment.pdfUrl) {
      return res.status(200).json({
        success: true,
        message: "PDF is ready",
        pdfUrl: assignment.pdfUrl,
      });
    }

    
    if (assignment.pdfStatus === "PENDING" || assignment.pdfStatus === "PROCESSING") {
      return res.status(202).json({
        success: true,
        message: "PDF is currently being generated. Please wait.",
        pdfStatus: assignment.pdfStatus,
      });
    }

    
    await Assignment.findByIdAndUpdate(assignment._id, { pdfStatus: "PENDING" });
    await addPdfJob(assignment._id.toString());

    res.status(202).json({
      success: true,
      message: "PDF generation started in the background",
      pdfStatus: "PENDING",
    });
  } catch (err) {
    next(err);
  }
};
