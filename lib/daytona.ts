import {
  Daytona,
  DaytonaNotFoundError,
  DaytonaTimeoutError,
} from "@daytona/sdk"

export function createDaytonaClient() {
  const apiUrl =
    process.env.DAYTONA_API_URL?.trim() ||
    process.env.DAYTONA_SERVER_URL?.trim() ||
    "https://app.daytona.io/api"

  return new Daytona({ apiUrl })
}

export async function createSandbox() {
  const daytona = createDaytonaClient()

  try {
    const sandbox = await daytona.create()
    return sandbox.id
  } catch (error) {
    if (error instanceof DaytonaTimeoutError && error.sandboxId) {
      try {
        const sandbox = await daytona.get(error.sandboxId)
        await daytona.delete(sandbox)
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `Failed to clean up Daytona sandbox ${error.sandboxId} after creation timed out`
        )
      }
    }

    throw error
  }
}

export async function deleteSandbox(sandboxId: string) {
  const daytona = createDaytonaClient()

  try {
    const sandbox = await daytona.get(sandboxId)
    await daytona.delete(sandbox)
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) {
      return
    }

    throw error
  }
}
