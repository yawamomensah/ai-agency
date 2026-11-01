import { clerkClient } from "@clerk/nextjs/server"

import { PAID_PLAN_SLUG } from "@/lib/billing"

export async function userHasPaidPlan(userId: string) {
  const clerk = await clerkClient()
  const subscription = await clerk.billing.getUserBillingSubscription(userId)

  return (
    subscription.status === "active" &&
    subscription.subscriptionItems.some(
      (item) => item.status === "active" && item.plan?.slug === PAID_PLAN_SLUG
    )
  )
}
