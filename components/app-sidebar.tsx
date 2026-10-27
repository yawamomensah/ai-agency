"use client"

import { useEffect, useState } from "react"
import { UserButton } from "@clerk/nextjs"
import { Plus, Search, UsersRound } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SidebarChat = {
  id: string
  title: string
  avatarSeed: string
  preview: string
  lastMessageAt: string
  timeLabel: string
}

export function AppSidebar({ chats }: { chats: SidebarChat[] }) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setChatSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton tooltip="Create" aria-label="Create">
                    <Plus />
                    <span className="group-data-[collapsible=icon]:hidden">
                      Create
                    </span>
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                  <Plus />
                  Create new bot
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UsersRound />
                  Create group chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search chats"
              aria-label="Search chats (Control or Command + K)"
              onClick={() => setChatSearchOpen(true)}
              className="rounded-lg border border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:hover:text-sidebar-accent-foreground"
            >
              <Search />
              <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">
                Search
              </span>
              <KbdGroup className="group-data-[collapsible=icon]:hidden">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <BotDialog
          open={botDialogOpen}
          onOpenChange={setBotDialogOpen}
        />
      </SidebarHeader>
      <CommandDialog
        open={chatSearchOpen}
        onOpenChange={setChatSearchOpen}
        title="Search chats"
        description="Search and select a chat to open."
      >
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CommandEmpty>No chats found.</CommandEmpty>
            <CommandGroup heading="Chats">
              {chats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.preview}`}
                  onSelect={() => {
                    setChatSearchOpen(false)
                    router.push(`/chats/${chat.id}`)
                  }}
                  className="py-2"
                >
                  <ChatAvatar seed={chat.avatarSeed} className="shrink-0" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-medium">{chat.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {chat.preview}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {chats.length > 0 ? (
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      render={<Link href={`/chats/${chat.id}`} />}
                      size="lg"
                      tooltip={chat.title}
                      className="h-auto min-h-16 items-start py-2 group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:min-h-8! group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:py-2!"
                    >
                      <ChatAvatar
                        seed={chat.avatarSeed}
                        className="mt-1 shrink-0 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:size-4"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1 group-data-[collapsible=icon]:hidden">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate font-medium">
                            {chat.title}
                          </span>
                          <time
                            dateTime={chat.lastMessageAt}
                            className="shrink-0 text-xs text-muted-foreground"
                          >
                            {chat.timeLabel}
                          </time>
                        </div>
                        <span className="truncate text-sm text-muted-foreground">
                          {chat.preview}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                No chats yet
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem className="relative h-8 w-full rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-within:bg-sidebar-accent focus-within:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8">
            <UserButton
              showName
              appearance={{
                elements: {
                  userButtonBox:
                    "flex h-8 w-full min-w-0 group-data-[collapsible=icon]:size-8",
                  userButtonTrigger:
                    "flex h-8 w-full flex-row items-center gap-2 rounded-md p-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1",
                  userButtonAvatarBox:
                    "order-first size-6 group-data-[collapsible=icon]:size-6",
                  userButtonOuterIdentifier:
                    "order-last truncate text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
