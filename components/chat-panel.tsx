"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react"
import type { PanelImperativeHandle } from "react-resizable-panels"
import { Maximize2, X } from "lucide-react"

import { getSandboxVncUrl } from "@/actions/chat"
import { usePlanUpgradeToast } from "@/components/plan-upgrade-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { ResizablePanel } from "@/components/ui/resizable"

type ChatPanelContextValue = {
  isOpen: boolean
  togglePanel: () => void
  panelRef: RefObject<PanelImperativeHandle | null>
  setIsOpen: (isOpen: boolean) => void
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null)

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const panelRef = useRef<PanelImperativeHandle | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const togglePanel = useCallback(() => {
    const panel = panelRef.current
    if (!panel) {
      return
    }

    if (panel.isCollapsed()) {
      panel.resize("30%")
    } else {
      panel.collapse()
    }
  }, [])

  return (
    <ChatPanelContext.Provider
      value={{ isOpen, togglePanel, panelRef, setIsOpen }}
    >
      {children}
    </ChatPanelContext.Provider>
  )
}

export function useChatPanel() {
  const context = useContext(ChatPanelContext)
  if (!context) {
    throw new Error("useChatPanel must be used within a ChatPanelProvider.")
  }

  return context
}

export function ChatSidePanel({ chatId }: { chatId: string }) {
  const { panelRef, setIsOpen } = useChatPanel()
  const [hasOpened, setHasOpened] = useState(false)

  return (
    <ResizablePanel
      collapsible
      collapsedSize="0%"
      defaultSize="0%"
      maxSize="50%"
      minSize="0%"
      onResize={(size) => {
        const nextIsOpen = size.asPercentage > 0
        setIsOpen(nextIsOpen)
        if (nextIsOpen) {
          setHasOpened(true)
        }
      }}
      panelRef={panelRef}
    >
      <SandboxPreview chatId={chatId} enabled={hasOpened} />
    </ResizablePanel>
  )
}

function SandboxPreview({
  chatId,
  enabled,
}: {
  chatId: string
  enabled: boolean
}) {
  const showPlanUpgradeToast = usePlanUpgradeToast()
  const previewHostRef = useRef<HTMLDivElement>(null)
  const dialogHostRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [frameReady, setFrameReady] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let active = true

    getSandboxVncUrl(chatId)
      .then((result) => {
        if (!active) {
          return
        }

        if (!result.success) {
          if (result.upgradeRequired) {
            showPlanUpgradeToast("Upgrade to Pro to connect to bot sandboxes.")
          }
          setError("Sandbox access requires the Pro plan.")
          setIsLoading(false)
          return
        }

        const iframe = document.createElement("iframe")
        iframe.src = result.url
        iframe.title = "Daytona sandbox desktop"
        iframe.allow = "clipboard-read; clipboard-write; fullscreen"
        iframe.allowFullscreen = true
        iframe.referrerPolicy = "no-referrer"
        iframe.tabIndex = 0
        iframe.className = "size-full border-0 bg-black"
        iframeRef.current = iframe
        setFrameReady(true)
        setIsLoading(false)
      })
      .catch(() => {
        if (active) {
          setError("Could not load the sandbox preview.")
          setIsLoading(false)
        }
      })

    return () => {
      active = false
      iframeRef.current?.remove()
      iframeRef.current = null
    }
  }, [chatId, enabled, showPlanUpgradeToast])

  useLayoutEffect(() => {
    if (!frameReady) {
      return
    }

    const iframe = iframeRef.current
    const host = dialogOpen ? dialogHostRef.current : previewHostRef.current

    if (iframe && host) {
      // Moving the same iframe node preserves the live VNC connection.
      host.replaceChildren(iframe)
      if (dialogOpen) {
        iframe.focus()
      }
    }
  }, [dialogOpen, frameReady])

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3">
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-sm font-medium">Sandbox preview</p>
          <Button
            aria-label="Open sandbox preview fullscreen"
            disabled={isLoading || Boolean(error)}
            onClick={() => setDialogOpen(true)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Maximize2 />
          </Button>
        </div>
        <button
          aria-label="Open sandbox desktop fullscreen"
          className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-md border bg-black text-left"
          disabled={isLoading || Boolean(error)}
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            ref={previewHostRef}
          />
          {(isLoading || error) && (
            <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
              {error ?? "Connecting to sandbox..."}
            </span>
          )}
        </button>
      </div>

      <Dialog
        disablePointerDismissal
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true)
          }
        }}
      >
        <DialogContent
          className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black p-0 sm:max-w-none"
          showCloseButton={false}
        >
          <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 text-white">
            <DialogTitle>Sandbox desktop</DialogTitle>
            <DialogClose
              render={
                <Button
                  aria-label="Close fullscreen sandbox preview"
                  className="text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setDialogOpen(false)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <X />
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1" ref={dialogHostRef} />
        </DialogContent>
      </Dialog>
    </>
  )
}
