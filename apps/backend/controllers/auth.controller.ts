import type  { Request, Response , NextFunction } from "express";
import User from "../models/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import z from "zod";

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    school: z.string(),
    role: z.enum(["ADMIN", "TEACHER"]).optional(),
});

const adminRegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    school: z.string(),
    role: z.enum(["ADMIN", "TEACHER"]).optional(),
    adminSecret: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});


export const register = async (req: Request, res: Response, next: NextFunction) => {
    try{

        const parse = registerSchema.safeParse(req.body);
        if(!parse.success){
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: parse.error.issues,
            });
        }

        const { email, password, name, school, role } = parse.data;

        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({
                success: false,
                message: "Email already in use",
            });
        }

        const salt = await bcrypt.genSaltSync(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            email,
            name,
            school,
            role: "TEACHER",
            hashedPassword,
        });
        await user.save();
        const token = jwt.sign({ userId: user._id , role: user.role  }, JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
            token,
        });

    }catch(err){
        next(err);
    }

};

export const registerAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try{

        const parse = adminRegisterSchema.safeParse(req.body);
        if(!parse.success){
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: parse.error.issues,
            });
        }

        const { email, password, name, school, role , adminSecret } = parse.data;
        
        if(adminSecret !== process.env.ADMIN_SECRET){
            return res.status(403).json({
                success: false,
                message: "Invalid admin secret",
            });
        }

        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({
                success: false,
                message: "Email already in use",
            });
        }

        const salt = await bcrypt.genSaltSync(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            email,
            name,
            school,
            role: "ADMIN",
            hashedPassword,
        });
        await user.save();
        const token = jwt.sign({ userId: user._id , role: user.role  }, JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            user,
            token,
        });

    }catch(err){
        next(err);
    }

};



export const login = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const parse = loginSchema.safeParse(req.body);
        if(!parse.success){
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: parse.error.issues,
            });
        }

        const { email, password } = parse.data;

        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isMatch = await bcrypt.compare(password, user.hashedPassword);
        if(!isMatch){
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign({ userId: user._id , role: user.role  }, JWT_SECRET, { expiresIn: "7d" });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user,
        });

    }catch(err){
        next(err);
    }   
};



export const logout = async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try{

    const userId = req.userId;
    const user = await User.findById(userId).select("-hashedPassword");

    if(!user){
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    res.status(200).json({
        success: true,
        user,
    });

  }catch(err){
    next(err);
  }
};