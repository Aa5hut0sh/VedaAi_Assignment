export interface User {
  id: string;
  name: string;
  email: string;
  school?: string;
  role: "TEACHER" | "ADMIN";
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  school: string;
  role?: string;
}