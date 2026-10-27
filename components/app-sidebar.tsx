import { UserButton } from "@clerk/nextjs"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem className="relative h-8 w-full rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-within:bg-sidebar-accent focus-within:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground">
            <UserButton
              showName
              appearance={{
                elements: {
                  userButtonBox: "flex h-8 w-full min-w-0",
                  userButtonTrigger:
                    "flex h-8 w-full flex-row items-center gap-2 rounded-md p-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
                  userButtonAvatarBox: "order-first size-6",
                  userButtonOuterIdentifier:
                    "order-last truncate text-sm text-sidebar-foreground",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
