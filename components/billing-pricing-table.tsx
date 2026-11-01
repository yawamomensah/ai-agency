"use client"

import { PricingTable } from "@clerk/nextjs"
import { Component, type ReactNode } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"

type Props = { children: ReactNode }
type State = { hasError: boolean }

class PricingTableErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error("Could not load Clerk pricing table", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            Checkout is not available yet. Enable Clerk Billing and configure a
            user plan to accept subscriptions.
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}

export function BillingPricingTable() {
  return (
    <PricingTableErrorBoundary>
      <PricingTable for="user" />
    </PricingTableErrorBoundary>
  )
}
