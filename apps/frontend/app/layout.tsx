import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast"; // Add this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VedaAI - Teacher Portal",
  description: "AI-Powered Exam Generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-center" /> {/* Add this line */}
        {children}
      </body>
    </html>
  );
}