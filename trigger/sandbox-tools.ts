import type { Daytona } from "@daytona/sdk"
import { tool } from "ai"
import { posix } from "node:path"
import { z } from "zod"

import { createDaytonaClient } from "@/lib/daytona"

const MAX_FILE_BYTES = 64 * 1024
const MAX_COMMAND_OUTPUT_LENGTH = 12_000
const MAX_LISTED_FILES = 200

function getWorkspacePath(pathInput: string, allowRoot = false) {
  const input = pathInput.trim().replaceAll("\\", "/")

  if (
    !input ||
    input.startsWith("/") ||
    input.includes("\0") ||
    input.split("/").includes("..")
  ) {
    throw new Error("Use a relative path inside the sandbox workspace.")
  }

  const normalizedPath = posix.normalize(input)

  if (normalizedPath === "." && !allowRoot) {
    throw new Error("A file path inside the sandbox workspace is required.")
  }

  return normalizedPath === "." ? "workspace" : `workspace/${normalizedPath}`
}

function toScreenshotOutput(
  screenshot: string | undefined,
  width: number,
  height: number,
  sizeBytes: number | undefined
) {
  if (!screenshot) {
    throw new Error("The sandbox did not return a screenshot.")
  }

  return {
    data: screenshot.replace(/^data:image\/[^;]+;base64,/, ""),
    height,
    mediaType: "image/jpeg",
    sizeBytes,
    width,
  }
}

export function createSandboxTools(sandboxId: string | null) {
  const daytona = sandboxId ? createDaytonaClient() : null
  let sandboxPromise: ReturnType<Daytona["get"]> | undefined
  let computerUseReady: Promise<Awaited<ReturnType<Daytona["get"]>>> | undefined

  const getSandbox = () => {
    if (!daytona || !sandboxId) {
      throw new Error("This bot does not have an assigned sandbox.")
    }

    sandboxPromise ??= daytona.get(sandboxId).then(async (sandbox) => {
      if (sandbox.state !== "started") {
        await sandbox.start(60)
      }

      return sandbox
    })

    return sandboxPromise
  }

  const getComputerUseSandbox = () => {
    computerUseReady ??= getSandbox().then(async (sandbox) => {
      const { status } = await sandbox.computerUse.getStatus()
      if (status !== "running") {
        await sandbox.computerUse.start()
      }

      return sandbox
    })

    return computerUseReady
  }

  const takeScreenshot = async () => {
    const sandbox = await getComputerUseSandbox()
    const [screenshot, display] = await Promise.all([
      sandbox.computerUse.screenshot.takeCompressed({
        format: "jpeg",
        quality: 65,
        scale: 1,
      }),
      sandbox.computerUse.display.getInfo(),
    ])
    const primaryDisplay =
      display.displays?.find((item) => item.isActive) ?? display.displays?.[0]

    if (!primaryDisplay?.width || !primaryDisplay.height) {
      throw new Error("The sandbox did not return display dimensions.")
    }

    return toScreenshotOutput(
      screenshot.screenshot,
      primaryDisplay.width,
      primaryDisplay.height,
      screenshot.sizeBytes
    )
  }

  const screenshotToModelOutput = ({
    output,
  }: {
    output: ReturnType<typeof takeScreenshot> extends Promise<infer T>
      ? T
      : never
  }) => ({
    type: "content" as const,
    value: [
      {
        type: "image-data" as const,
        mediaType: output.mediaType,
        data: output.data,
      },
    ],
  })

  return {
    bash: tool({
      description:
        "Run a command in this bot's assigned sandbox, with the working directory set to workspace/. Commands time out after 60 seconds.",
      inputSchema: z.object({
        command: z.string().trim().min(1).max(4000),
      }),
      execute: async ({ command }) => {
        const sandbox = await getSandbox()
        const result = await sandbox.process.executeCommand(
          command,
          "workspace",
          undefined,
          60
        )

        return {
          exitCode: result.exitCode,
          output:
            result.result.length > MAX_COMMAND_OUTPUT_LENGTH
              ? `${result.result.slice(0, MAX_COMMAND_OUTPUT_LENGTH)}\n[Output truncated]`
              : result.result,
        }
      },
    }),
    readFile: tool({
      description:
        "Read a UTF-8 file using a path relative to workspace/. Absolute paths and parent-directory traversal are not allowed.",
      inputSchema: z.object({
        path: z.string().trim().min(1).max(512),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox()
        const remotePath = getWorkspacePath(path)
        const file = await sandbox.fs.getFileDetails(remotePath)

        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            "Files larger than 64 KiB cannot be read with this tool."
          )
        }

        const contents = await sandbox.fs.downloadFile(remotePath)
        return { contents: contents.toString("utf8"), path }
      },
    }),
    writeFile: tool({
      description:
        "Write UTF-8 contents to a file using a path relative to workspace/. Absolute paths and parent-directory traversal are not allowed.",
      inputSchema: z.object({
        content: z.string().max(MAX_FILE_BYTES),
        path: z.string().trim().min(1).max(512),
      }),
      execute: async ({ content, path }) => {
        if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
          throw new Error(
            "Files larger than 64 KiB cannot be written with this tool."
          )
        }

        const sandbox = await getSandbox()
        const remotePath = getWorkspacePath(path)
        const parentPath = posix.dirname(remotePath)

        if (parentPath !== "workspace") {
          await sandbox.fs.createFolder(parentPath, "755")
        }

        await sandbox.fs.uploadFile(Buffer.from(content, "utf8"), remotePath)
        return { bytesWritten: Buffer.byteLength(content, "utf8"), path }
      },
    }),
    listFiles: tool({
      description:
        "List files and directories in a path relative to workspace/. Defaults to the workspace root; parent-directory traversal is not allowed.",
      inputSchema: z.object({
        depth: z.number().int().min(1).max(3).default(1),
        path: z.string().trim().max(512).default("."),
      }),
      execute: async ({ depth, path }) => {
        const sandbox = await getSandbox()
        const remotePath = getWorkspacePath(path, true)
        const files = await sandbox.fs.listFiles(remotePath, { depth })

        return {
          entries: files.slice(0, MAX_LISTED_FILES).map((file) => ({
            isDirectory: file.isDir,
            name: file.name,
            path: file.path,
            size: file.size,
          })),
          truncated: files.length > MAX_LISTED_FILES,
        }
      },
    }),
    mouseClick: tool({
      description: "Click the mouse at screen coordinates in the sandbox.",
      inputSchema: z.object({
        button: z.enum(["left", "middle", "right"]).default("left"),
        doubleClick: z.boolean().default(false),
        x: z.number().int().min(0).max(10000),
        y: z.number().int().min(0).max(10000),
      }),
      execute: async ({ button, doubleClick, x, y }) => {
        const sandbox = await getComputerUseSandbox()
        return sandbox.computerUse.mouse.click(x, y, button, doubleClick)
      },
    }),
    mouseMove: tool({
      description: "Move the mouse to screen coordinates in the sandbox.",
      inputSchema: z.object({
        x: z.number().int().min(0).max(10000),
        y: z.number().int().min(0).max(10000),
      }),
      execute: async ({ x, y }) => {
        const sandbox = await getComputerUseSandbox()
        return sandbox.computerUse.mouse.move(x, y)
      },
    }),
    mouseScroll: tool({
      description: "Scroll the sandbox screen at the given coordinates.",
      inputSchema: z.object({
        amount: z.number().int().min(1).max(10).default(3),
        direction: z.enum(["up", "down", "left", "right"]),
        x: z.number().int().min(0).max(10000),
        y: z.number().int().min(0).max(10000),
      }),
      execute: async ({ amount, direction, x, y }) => {
        const sandbox = await getComputerUseSandbox()
        return sandbox.computerUse.mouse.scroll(x, y, direction, amount)
      },
    }),
    keyboardType: tool({
      description:
        "Type text into the currently focused control in the sandbox.",
      inputSchema: z.object({
        text: z.string().max(2000),
      }),
      execute: async ({ text }) => {
        const sandbox = await getComputerUseSandbox()
        await sandbox.computerUse.keyboard.type(text)
        return { charactersTyped: text.length }
      },
    }),
    keyboardPress: tool({
      description:
        "Press a key with optional modifiers in the sandbox. Common modifiers: ctrl, alt, shift, cmd.",
      inputSchema: z.object({
        key: z.string().trim().min(1).max(40),
        modifiers: z
          .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
          .max(4)
          .optional(),
      }),
      execute: async ({ key, modifiers }) => {
        const sandbox = await getComputerUseSandbox()
        await sandbox.computerUse.keyboard.press(key, modifiers)
        return { key, modifiers: modifiers ?? [] }
      },
    }),
    viewScreen: tool({
      description:
        "Capture the sandbox screen for your own visual inspection. Do not show or describe this image to the user unless asked.",
      inputSchema: z.object({}),
      execute: takeScreenshot,
      toModelOutput: screenshotToModelOutput,
    }),
    showScreen: tool({
      description:
        "Capture and show the sandbox screen when the user explicitly asks what is on screen or asks to see it.",
      inputSchema: z.object({}),
      execute: takeScreenshot,
      toModelOutput: screenshotToModelOutput,
    }),
  }
}

export type SandboxTools = ReturnType<typeof createSandboxTools>
