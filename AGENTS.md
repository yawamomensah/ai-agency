<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git

- Never create branches, worktrees, or commits automically. Only do so when the user explicitly asks for that specific action in the current request.
- Leave changes uncommited in the working tree on the current branch and let the user decide hen and how to commit.

## Database

- This is a development project. There is no backwards compatability and the data is worthless. Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working. Every schema change means a clean slate.

- Apply schema changes only with `npm run db:push` (`drizzle-kit push`).
- Never use migrations: do not run `drizzle-kit generate` or `drizzle-kit migrate`, and do not create migration files or a `drizzle/` folder.

## Forms

- Generate Zod schemas from Drizzle tables with `drizzle-zod` in `db/schema.ts`. Export the insert schema and derive a form schema by omitting server-controlled fields; keep only fields the user is allowed to submit. Add meaningful `.trim()`, `.min()`, and `.max()` validation to user-editable text.
- Build interactive forms as Client Components with React Hook Form and `zodResolver` using the shared form schema. Keep form values aligned with the schema, including optional and nullable fields.
- Compose fields with Shadcn `FieldGroup` and `Field`; use `FieldLabel` linked to the control, `data-invalid` on invalid fields, `aria-invalid` on controls, and `FieldError` for validation messages. Use `Input` for short text and `Textarea` for multiline text.
- Use Shadcn controls for choices, such as `ToggleGroup` for a small set of role presets. This project uses Base UI: single-value `ToggleGroup` state is an array and is updated with `onValueChange`; do not use Radix's `type="single"` API.
- Dialog forms must use the existing dialog primitives and include a `DialogTitle`. Disable submission and prevent closing while submitting; show pending feedback and explicit validation or operation errors.
- Treat every Server Action as a public endpoint: derive `userId` from Clerk `auth()` on the server, reject unauthenticated callers, validate the untrusted input again with the shared schema, and never accept a client-supplied owner ID. Return field validation errors for the form to display; surface unexpected database failures rather than silently reporting success.
- Use the shared Neon/Drizzle database helper for writes. Normalize empty optional text to `null` where the database field is nullable, and revalidate affected paths after successful mutations.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.