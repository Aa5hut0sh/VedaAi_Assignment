import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db';
import authRoutes from './routes/auth.routes';
import assignmentRoutes from './routes/assignment.routes';
import "./workers/generation.worker";
import "./workers/pdf.worker";
import { createServer } from 'http';
import cors from 'cors';
import { initSockets } from './sockets/socket';

// Connect to MongoDB
await connectDB().then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});



const app = express();
const PORT = process.env.PORT || 3001;

const server = createServer(app);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});


app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);


initSockets(server);


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});