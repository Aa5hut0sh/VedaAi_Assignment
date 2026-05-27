import { Router } from 'express';
import { createAssignment, getAssignments,getAssignmentById, deleteAssignment, regenerateAssignment, downloadAssignment, getAllAssignments } from '../controllers/assignment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
const route = Router();

route.post("/create" ,authenticate, upload.single('file'), createAssignment);
route.get("/all", authenticate, getAssignments);
route.get("/all-admin" , authenticate, getAllAssignments); // For admin dashboard to view all assignments across teachers
route.get("/:id", authenticate, getAssignmentById);
route.delete("/:id", authenticate, deleteAssignment);
route.post("/:id/regenerate", authenticate, regenerateAssignment);
route.get("/:id/download", authenticate, downloadAssignment);


export default route;