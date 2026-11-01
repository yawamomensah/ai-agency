import { Check } from "lucide-react"

import { BillingPricingTable } from "@/components/billing-pricing-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const includedFeatures = [
  "Create and use bots",
  "Create, connect to, and use sandboxes",
]

export default function PricingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Simple pricing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Unlock your AI workspace
          </h1>
          <p className="text-muted-foreground">
            One plan gives you access to every bot and sandbox feature.
          </p>
        </header>

        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle className="text-xl">Pro</CardTitle>
            <CardDescription>
              Full access to bots and isolated sandboxes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p>
              <span className="text-4xl font-semibold">$10</span>
              <span className="text-muted-foreground"> / month</span>
            </p>
            <ul className="flex flex-col gap-3">
              {includedFeatures.map((feature) => (
                <li className="flex items-center gap-2" key={feature}>
                  <Check aria-hidden="true" className="text-muted-foreground" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <BillingPricingTable />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
