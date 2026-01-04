"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/brand";
import { useSidebar } from "@/contexts/SidebarContext";

const navItems = [
  { href: "/decks", label: "Decks", icon: BookOpen },
  { href: "/dashboard", label: "Statistiques", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out shrink-0",
        // Clean layout: sidebar is either fully open (w-64) or completely hidden (w-0)
        // When closed, it's taken out of the flex flow on mobile via fixed position
        // On desktop, it stays in flow but with w-0 so no space is taken
        isOpen
          ? "w-64 relative"
          : "w-0 overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b px-6 overflow-hidden">
        <h1 className="text-xl font-semibold whitespace-nowrap">
          {APP_NAME}
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

