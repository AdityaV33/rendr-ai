import http from "node:http";
import { ChildProcess } from "node:child_process";

import { BadRequestError, InternalServerError } from "../lib/http-error.js";

import {
  releasePort,
  getAvailablePort,
} from "./port.service.js";
import {
  startProcess,
  stopProcess,
} from "./process.service.js";
import {
  getWorkspacePath,
  workspaceExists,
} from "./workspace.service.js";

export interface PreviewResult {
  port: number;
  url: string;
  process: ChildProcess;
}

/** Maximum time (ms) to wait for the Vite dev server to respond. */
const PREVIEW_STARTUP_TIMEOUT_MS = 10_000;

/** Interval (ms) between health-check polls. */
const PREVIEW_POLL_INTERVAL_MS = 500;

/**
 * Poll a URL until it returns a successful HTTP response
 * or the timeout expires.
 *
 * Rejects immediately if the child process exits before
 * the server becomes healthy.
 */
function waitForServer(
  url: string,
  child: ChildProcess,
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>(
    (resolve, reject) => {
      let settled = false;
      // eslint-disable-next-line prefer-const
      let pollTimer: ReturnType<typeof setInterval>;

      const cleanup = () => {
        settled = true;
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
        child.removeListener("exit", onExit);
      };

      const onExit = (
        code: number | null,
      ) => {
        if (!settled) {
          cleanup();
          reject(
            new InternalServerError(
              `Preview server exited unexpectedly with code ${code}.`,
            ),
          );
        }
      };

      child.once("exit", onExit);

      const timeoutTimer = setTimeout(
        () => {
          if (!settled) {
            cleanup();
            reject(
              new InternalServerError(
                "Preview server did not start within the timeout period.",
              ),
            );
          }
        },
        timeoutMs,
      );

      const poll = () => {
        if (settled) return;

        const req = http.get(
          url,
          (res) => {
            if (
              res.statusCode &&
              res.statusCode < 500
            ) {
              cleanup();
              resolve();
            }
            // Consume the response body to free the socket
            res.resume();
          },
        );

        req.on("error", () => {
          // Server not ready yet; will retry on next interval
        });

        req.setTimeout(1000, () => {
          req.destroy();
        });
      };

      // Start polling immediately, then on interval
      poll();
      pollTimer = setInterval(
        poll,
        PREVIEW_POLL_INTERVAL_MS,
      );
    },
  );
}

export async function startPreview(
  projectId: string,
): Promise<PreviewResult> {
  if (!(await workspaceExists(projectId))) {
    throw new BadRequestError(
      "Workspace does not exist. Please initialize the runtime first.",
    );
  }

  const workspacePath =
    getWorkspacePath(projectId);
  const port = await getAvailablePort();
  const url = `http://127.0.0.1:${port}`;

  let child: ChildProcess | undefined;

  try {
    child = startProcess(
      "npm",
      [
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--port",
        String(port),
        "--strictPort",
      ],
      {
        cwd: workspacePath,
      },
    );

    await waitForServer(
      url,
      child,
      PREVIEW_STARTUP_TIMEOUT_MS,
    );

    return {
      port,
      url,
      process: child,
    };
  } catch (error) {
    releasePort(port);

    if (child) {
      stopProcess(child);
    }

    throw error;
  }
}

export function stopPreview(
  preview: PreviewResult,
): void {
  stopProcess(preview.process);
  releasePort(preview.port);
}