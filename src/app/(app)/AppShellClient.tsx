"use client";

import { AppSidebar } from "@/components/shell/AppSidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { usePathname } from "next/navigation";

export default function AppShellClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStudyPage = pathname?.startsWith("/study");

  if (isStudyPage) {
    return (
      <div className="app-shell flex h-screen w-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
