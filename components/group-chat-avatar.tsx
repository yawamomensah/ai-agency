import { cn } from "cn"

import { ChatAvatar } from "@/components/chat-avatar"

type GroupChatAvatarProps = {
  seeds: string[]
  label?: string
  className?: string
}

export function GroupChatAvatar({
  seeds,
  label,
  className,
}: GroupChatAvatarProps) {
  const visibleSeeds = seeds.slice(0, 3)
  const hiddenCount = Math.max(0, seeds.length - visibleSeeds.length)
  const accessibleLabel =
    label ?? `${seeds.length} bot${seeds.length === 1 ? "" : "s"} in this chat`

  if (seeds.length <= 1) {
    return (
      <span
        role="img"
        aria-label={accessibleLabel}
        className={cn("block size-8 shrink-0", className)}
      >
        <ChatAvatar seed={seeds[0] ?? "group-chat"} className="size-full" />
      </span>
    )
  }

  if (seeds.length === 2) {
    return (
      <span
        role="img"
        aria-label={accessibleLabel}
        className={cn("relative block size-8 shrink-0", className)}
      >
        {visibleSeeds.map((seed, index) => (
          <ChatAvatar
            key={`${seed}-${index}`}
            seed={seed}
            className={cn(
              "absolute top-[18.75%] size-[62.5%] ring-1 ring-background",
              index === 0 ? "left-0 z-10" : "right-0 z-20"
            )}
          />
        ))}
      </span>
    )
  }

  if (seeds.length === 3) {
    return (
      <span
        role="img"
        aria-label={accessibleLabel}
        className={cn("relative block size-8 shrink-0", className)}
      >
        {visibleSeeds.map((seed, index) => (
          <ChatAvatar
            key={`${seed}-${index}`}
            seed={seed}
            className={cn(
              "absolute size-[56.25%] ring-1 ring-background",
              index === 0
                ? "top-0 left-1/2 z-20 -translate-x-1/2"
                : index === 1
                  ? "bottom-0 left-0 z-10"
                  : "right-0 bottom-0 z-10"
            )}
          />
        ))}
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={accessibleLabel}
      className={cn("@container relative block size-8 shrink-0", className)}
    >
      {visibleSeeds.map((seed, index) => (
        <ChatAvatar
          key={`${seed}-${index}`}
          seed={seed}
          className={cn(
            "absolute size-1/2 rounded-none",
            index === 0
              ? "top-0 left-0"
              : index === 1
                ? "top-0 right-0"
                : "bottom-0 left-0"
          )}
        />
      ))}
      <span className="absolute right-0 bottom-0 flex size-1/2 items-center justify-center bg-muted text-[min(40cqw,8px)] font-semibold text-muted-foreground">
        +{hiddenCount}
      </span>
    </span>
  )
}
