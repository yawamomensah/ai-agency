"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Plus, Shuffle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
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
import { Button } from "@/components/ui/button"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createBotSchema } from "@/db/schema"

type CreateBotValues = z.infer<typeof createBotSchema>

const botRoles = [
  "Research assistant",
  "Code reviewer",
  "Writing editor",
  "Tutor",
]

export function BotDialog({
  open: openProp,
  onOpenChange,
  bot,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  bot?: {
    id: string
    name: string
    avatar: string
    job: string
    instructions: string | null
  }
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [avatarSeed, setAvatarSeed] = useState(bot?.avatar ?? "new-bot")
  const [selectedRole, setSelectedRole] = useState(
    bot && botRoles.includes(bot.job) ? bot.job : ""
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isControlled = openProp !== undefined
  const open = openProp ?? internalOpen
  const router = useRouter()

  function setOpen(nextOpen: boolean) {
    if (isControlled) {
      onOpenChange?.(nextOpen)
    } else {
      setInternalOpen(nextOpen)
    }
  }

  const form = useForm<CreateBotValues>({
    resolver: zodResolver(createBotSchema),
    defaultValues: {
      avatar: bot?.avatar ?? "new-bot",
      name: bot?.name ?? "",
      job: bot?.job ?? "",
      instructions: bot?.instructions ?? "",
    },
  })
  const isBusy = form.formState.isSubmitting || isDeleting

  async function onSubmit(values: CreateBotValues) {
    setFormError(null)

    try {
      const result = bot
        ? await updateBot(bot.id, values)
        : await createBot(values)

      if (!result.success) {
        setFormError(result.error)
        for (const field of ["name", "job", "instructions"] as const) {
          const message = result.fieldErrors[field]?.[0]
          if (message) {
            form.setError(field, { type: "server", message })
          }
        }
        return
      }

      toast.add({
        title: bot ? "Bot updated" : "Bot created",
        description: bot
          ? `${values.name} has been updated.`
          : `${values.name} is ready to use.`,
        type: "success",
      })
      if (!bot) {
        form.reset()
        setAvatarSeed("new-bot")
        setSelectedRole("")
      } else {
        router.refresh()
      }
      setOpen(false)
    } catch (error) {
      console.error(
        bot ? "Failed to update bot" : "Failed to create bot",
        error
      )
      setFormError(
        bot
          ? "We couldn’t update this bot. Please try again."
          : "We couldn’t create your bot. Please try again."
      )
    }
  }

  async function onDelete() {
    if (!bot) {
      return
    }

    setDeleteError(null)
    setIsDeleting(true)

    try {
      const result = await deleteBot(bot.id)

      if (!result.success) {
        setDeleteError(result.error)
        return
      }

      toast.add({
        title: "Bot deleted",
        description: `${bot.name} has been deleted.`,
        type: "success",
      })
      setDeleteDialogOpen(false)
      setOpen(false)
      router.replace("/")
      router.refresh()
    } catch (error) {
      console.error("Failed to delete bot", error)
      setDeleteError("We couldn’t delete this bot. Please try again.")
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
      {!isControlled && (
        <DialogTrigger
          render={
            bot ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 min-w-0 justify-start gap-2 px-0 text-white hover:bg-transparent hover:text-white"
                aria-label={`Edit ${bot.name}`}
              >
                <ChatAvatar seed={bot.avatar} className="size-4 shrink-0" />
                <span className="truncate text-sm font-medium">{bot.name}</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                className="h-10 rounded-xl px-4"
              >
                <Plus data-icon="inline-start" />
                Create a new bot
              </Button>
            )
          }
        />
      )}
      <DialogContent className="gap-0 p-0 sm:max-w-[49rem]">
        <DialogHeader className="gap-1 px-6 pt-6">
          <DialogTitle className="text-xl">
            {bot ? "Edit bot" : "New bot"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {bot
              ? "Update its face, name, and job."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 p-6"
        >
          <ToggleGroup
            aria-label="Suggested bot roles"
            value={selectedRole ? [selectedRole] : []}
            onValueChange={(values) => {
              const selected = values[0]
              if (selected) {
                setSelectedRole(selected)
                form.setValue("job", selected, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            }}
            variant="outline"
            className="w-full flex-wrap"
          >
            {botRoles.map((role) => (
              <ToggleGroupItem key={role} value={role} className="rounded-full">
                {role}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <FieldGroup className="gap-5">
            <Field>
              <FieldTitle>Face</FieldTitle>
              <div className="flex items-center gap-4">
                <ChatAvatar
                  seed={avatarSeed}
                  className="size-14 rounded-none"
                />
                <p className="text-sm text-muted-foreground">
                  Shuffle until you find one you like.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  disabled={isBusy}
                  onClick={() => {
                    const nextSeed = crypto.randomUUID()
                    setAvatarSeed(nextSeed)
                    form.setValue("avatar", nextSeed, {
                      shouldDirty: true,
                    })
                  }}
                >
                  <Shuffle data-icon="inline-start" />
                  Shuffle
                </Button>
              </div>
            </Field>

            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                id="bot-name"
                autoComplete="off"
                placeholder="Ada"
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

            <Field data-invalid={!!form.formState.errors.job}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                id="bot-job"
                autoComplete="off"
                placeholder="Research assistant"
                maxLength={120}
                aria-invalid={!!form.formState.errors.job}
                {...form.register("job", {
                  onChange: () => setSelectedRole(""),
                })}
              />
              <FieldError
                errors={
                  form.formState.errors.job ? [form.formState.errors.job] : []
                }
              />
            </Field>

            <Field data-invalid={!!form.formState.errors.instructions}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                id="bot-instructions"
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                maxLength={2000}
                aria-invalid={!!form.formState.errors.instructions}
                className="min-h-36 resize-y"
                {...form.register("instructions")}
              />
              <FieldError
                errors={
                  form.formState.errors.instructions
                    ? [form.formState.errors.instructions]
                    : []
                }
              />
            </Field>
          </FieldGroup>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="-mx-6 -mb-6 p-6">
            {bot && (
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
                Delete bot
              </Button>
            )}
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isBusy}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isBusy}>
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              {bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {bot && (
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
              <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this bot and its direct chats.
                Group chats will be kept.
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
                Delete bot
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  )
}
