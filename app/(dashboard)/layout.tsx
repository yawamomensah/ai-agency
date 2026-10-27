import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getUserChats } from "@/queries/bots"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [chats, cookieStore] = await Promise.all([
    getUserChats(),
    cookies(),
  ])
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar chats={chats} />
      <div className="min-w-0 flex-1">{children}</div>
    </SidebarProvider>
  )
}
