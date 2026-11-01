"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import {
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
} from "@/actions/group-chat"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { createGroupChatSchema } from "@/db/schema"

type GroupChatValues = z.infer<typeof createGroupChatSchema>
type GroupChatBot = {
  id: string
  name: string
  avatar: string
  job: string
}

export function GroupChatDialog({
  bots,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  chat,
}: {
  bots: GroupChatBot[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  chat?: {
    id: string
    name: string
    bots: GroupChatBot[]
  }
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const router = useRouter()
  const isControlled = openProp !== undefined
  const open = openProp ?? internalOpen
  const form = useForm<GroupChatValues>({
    resolver: zodResolver(createGroupChatSchema),
    defaultValues: {
      name: chat?.name ?? "",
      botIds: chat?.bots.map((bot) => bot.id) ?? [],
    },
  })
  const isBusy = form.formState.isSubmitting || isDeleting

  function setOpen(nextOpen: boolean) {
    if (isControlled) {
      onOpenChangeProp?.(nextOpen)
    } else {
      setInternalOpen(nextOpen)
    }

    if (nextOpen) {
      form.reset({
        name: chat?.name ?? "",
        botIds: chat?.bots.map((bot) => bot.id) ?? [],
      })
      setFormError(null)
    }
  }

  async function onSubmit(values: GroupChatValues) {
    setFormError(null)

    try {
      const result = chat
        ? await updateGroupChat(chat.id, values)
        : await createGroupChat(values)

      if (!result.success) {
        setFormError(result.error)
        for (const field of ["name", "botIds"] as const) {
          const message = result.fieldErrors[field]?.[0]
          if (message) {
            form.setError(field, { type: "server", message })
          }
        }
        return
      }

      toast.add({
        title: chat ? "Group chat updated" : "Group chat created",
        description: chat
          ? `${values.name} has been updated.`
          : `${values.name} is ready to use.`,
        type: "success",
      })
      setOpen(false)
      if (chat) {
        router.refresh()
      } else {
        form.reset()
        router.push(`/chats/${result.chatId}`)
        router.refresh()
      }
    } catch (error) {
      console.error(
        chat ? "Failed to update group chat" : "Failed to create group chat",
        error
      )
      setFormError(
        chat
          ? "We couldn’t update this group chat. Please try again."
          : "We couldn’t create this group chat. Please try again."
      )
    }
  }

  async function onDelete() {
    if (!chat) {
      return
    }

    setDeleteError(null)
    setIsDeleting(true)

    try {
      const result = await deleteGroupChat(chat.id)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }

      toast.add({
        title: "Group chat deleted",
        description: `${chat.name} has been deleted.`,
        type: "success",
      })
      setDeleteDialogOpen(false)
      setOpen(false)
      router.replace("/")
      router.refresh()
    } catch (error) {
      console.error("Failed to delete group chat", error)
      setDeleteError("We couldn’t delete this group chat. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) {
          setOpen(nextOpen)
        }
      }}
    >
      {chat && !isControlled && (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-8 min-w-0 justify-start gap-2 px-0 text-white hover:bg-transparent hover:text-white"
              aria-label={`Edit ${chat.name}`}
            >
              <GroupChatAvatar
                seeds={chat.bots.map((bot) => bot.avatar)}
                label={`Group chat with ${chat.bots.map((bot) => bot.name).join(", ")}`}
                className="size-4"
              />
              <span className="truncate text-sm font-medium">{chat.name}</span>
            </Button>
          }
        />
      )}
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <form
          className="flex flex-col gap-6 p-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <DialogHeader className="gap-1">
            <DialogTitle className="text-xl">
              {chat ? "Edit group chat" : "Create a group chat"}
            </DialogTitle>
            <DialogDescription>
              {chat
                ? "Update the group name and choose which bots are members."
                : "Give your chat a name and choose the bots you want to bring together."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-5">
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="group-chat-name">Group name</FieldLabel>
              <Input
                id="group-chat-name"
                autoComplete="off"
                placeholder="Product brainstorm"
                maxLength={80}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError
                errors={
                  form.formState.errors.name ? [form.formState.errors.name] : []
                }
              />
            </Field>

            <Controller
              control={form.control}
              name="botIds"
              render={({ field, fieldState }) => (
                <FieldSet>
                  <FieldLegend variant="label">Choose bots</FieldLegend>
                  <FieldDescription>
                    Select at least two bots. Up to three appear in the chat
                    avatar.
                  </FieldDescription>
                  <FieldGroup className="max-h-60 gap-2 overflow-y-auto">
                    {bots.map((bot) => {
                      const id = `group-chat-bot-${bot.id}`
                      const checked = field.value.includes(bot.id)

                      return (
                        <Field
                          key={bot.id}
                          orientation="horizontal"
                          data-invalid={!!fieldState.error}
                          className="items-center rounded-lg border p-3"
                        >
                          <Checkbox
                            id={id}
                            checked={checked}
                            aria-invalid={!!fieldState.error}
                            onCheckedChange={(nextChecked) => {
                              field.onChange(
                                nextChecked
                                  ? [...field.value, bot.id]
                                  : field.value.filter(
                                      (botId) => botId !== bot.id
                                    )
                              )
                            }}
                          />
                          <FieldContent>
                            <FieldLabel htmlFor={id} className="items-center">
                              <ChatAvatar
                                seed={bot.avatar}
                                className="size-6"
                              />
                              <span>{bot.name}</span>
                            </FieldLabel>
                            <FieldDescription>{bot.job}</FieldDescription>
                          </FieldContent>
                        </Field>
                      )
                    })}
                  </FieldGroup>
                  {bots.length === 0 && (
                    <FieldDescription>
                      Create at least two bots before starting a group chat.
                    </FieldDescription>
                  )}
                  {bots.length === 1 && (
                    <FieldDescription>
                      Create one more bot to start a group chat.
                    </FieldDescription>
                  )}
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : []}
                  />
                </FieldSet>
              )}
            />
          </FieldGroup>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="-mx-6 -mb-6 p-6">
            {chat && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={isBusy}
                onClick={() => {
                  setDeleteError(null)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 data-icon="inline-start" />
                Delete group chat
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy || bots.length < 2}>
              {isBusy ? (
                <>
                  <Spinner data-icon="inline-start" />
                  {chat ? "Saving…" : "Creating…"}
                </>
              ) : chat ? (
                "Save changes"
              ) : (
                "Create group chat"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {chat && (
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!isDeleting) {
              setDeleteDialogOpen(nextOpen)
              if (!nextOpen) {
                setDeleteError(null)
              }
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {chat.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this group chat and its
                conversation history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <Alert variant="destructive">
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={onDelete}
              >
                {isDeleting && <Spinner data-icon="inline-start" />}
                Delete group chat
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  )
}
