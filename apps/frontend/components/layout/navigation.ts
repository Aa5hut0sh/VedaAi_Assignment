import { LayoutGrid, Users, FileText, Wand2, Clock } from "lucide-react";

export const navItems = [
  { name: "Home", href: "/dashboard", icon: LayoutGrid },
  { name: "My Groups", href: "/dashboard/groups", icon: Users },
  { name: "Assignments", href: "/dashboard/assignments", icon: FileText, badge: "32" },
  { name: "AI Teacher's Toolkit", href: "/dashboard/toolkit", icon: Wand2 },
  { name: "My Library", href: "/dashboard/library", icon: Clock },
];