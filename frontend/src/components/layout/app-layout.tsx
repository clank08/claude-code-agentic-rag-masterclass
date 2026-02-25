import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThreadsProvider } from "@/contexts/threads-context";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <ThreadsProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </ThreadsProvider>
    </TooltipProvider>
  );
}
