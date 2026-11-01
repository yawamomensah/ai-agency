# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Billing

Bot creation and use, plus sandbox creation, connection, and use, require the
Clerk user plan with slug `pro`. Configure a publicly visible `pro` User Plan
for USD $10/month in Clerk Billing. The `/pricing` page uses Clerk's
`PricingTable` for checkout.

Enable Clerk Billing on a claimed Clerk application before configuring the
plan. The Trigger.dev environment must also have `CLERK_SECRET_KEY` configured
so each bot turn can verify the user's current subscription.
