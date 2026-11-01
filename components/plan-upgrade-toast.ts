"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"

import { toast } from "@/components/ui/toast"

export function usePlanUpgradeToast() {
  const router = useRouter()

  return useCallback(
    (description: string) => {
      toast.add({
        title: "Pro plan required",
        description,
        type: "error",
        timeout: 8000,
        actionProps: {
          children: "View pricing",
          onClick: () => router.push("/pricing"),
        },
      })
    },
    [router]
  )
}
