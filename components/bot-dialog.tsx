"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Plus, Shuffle } from "lucide-react"

import { createBot } from "@/actions/bot"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [avatarSeed, setAvatarSeed] = useState("new-bot")
  const [selectedRole, setSelectedRole] = useState("")
  const isControlled = openProp !== undefined
  const open = openProp ?? internalOpen

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
      avatar: "new-bot",
      name: "",
      job: "",
      instructions: "",
    },
  })
  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(values: CreateBotValues) {
    setFormError(null)

    try {
      const result = await createBot(values)

      if (!result.success) {
        setFormError(result.error)
        if (result.fieldErrors.name?.[0]) {
          form.setError("name", {
            type: "server",
            message: result.fieldErrors.name[0],
          })
        }
        if (result.fieldErrors.job?.[0]) {
          form.setError("job", {
            type: "server",
            message: result.fieldErrors.job[0],
          })
        }
        if (result.fieldErrors.instructions?.[0]) {
          form.setError("instructions", {
            type: "server",
            message: result.fieldErrors.instructions[0],
          })
        }
        return
      }

      form.reset()
      setAvatarSeed("new-bot")
      setSelectedRole("")
      setOpen(false)
    } catch (error) {
      console.error("Failed to create bot", error)
      setFormError("We couldn’t create your bot. Please try again.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          setOpen(nextOpen)
        }
      }}
    >
      {!isControlled && (
        <DialogTrigger
          render={
            <Button
              variant="secondary"
              size="lg"
              className="h-10 rounded-xl px-4"
            >
              <Plus data-icon="inline-start" />
              Create a new bot
            </Button>
          }
        />
      )}
      <DialogContent className="gap-0 p-0 sm:max-w-[49rem]">
        <DialogHeader className="gap-1 px-6 pt-6">
          <DialogTitle className="text-xl">New bot</DialogTitle>
          <DialogDescription className="text-base">
            Give it a face, a name, and a job to do.
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
                  disabled={isSubmitting}
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
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
