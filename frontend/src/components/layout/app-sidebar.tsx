import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Plus, Trash2, LogOut, MessageSquare, FileText, Settings } from "lucide-react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useThreadsContext } from "@/contexts/threads-context";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { threads, createThread, deleteThread } = useThreadsContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { threadId: activeThreadId } = useParams();

  const handleNewChat = async () => {
    navigate("/");
  };

  const handleSelectThread = (threadId: string) => {
    navigate(`/thread/${threadId}`);
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    await deleteThread(threadId);
    if (activeThreadId === threadId) {
      navigate("/");
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNewChat} className="justify-center">
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/" || location.pathname.startsWith("/thread")}
                  onClick={() => navigate("/")}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/documents"}
                  onClick={() => navigate("/documents")}
                >
                  <FileText className="h-4 w-4" />
                  <span>Documents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator />
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    isActive={thread.id === activeThreadId}
                    onClick={() => handleSelectThread(thread.id)}
                    className="group"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{thread.title}</span>
                    <div
                      role="button"
                      tabIndex={0}
                      className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 hover:bg-accent group-hover:opacity-100"
                      onClick={(e) => handleDeleteThread(e, thread.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Separator />
        <div className="flex items-center justify-between p-2">
          <span className="truncate text-sm text-muted-foreground">{user?.email}</span>
          <div className="flex items-center gap-1">
            <SettingsDialog />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
