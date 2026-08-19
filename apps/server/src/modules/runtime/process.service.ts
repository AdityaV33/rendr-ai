import {
  ChildProcess,
  SpawnOptions,
  spawn,
} from "node:child_process";
import treeKill from "tree-kill";
import { promisify } from "node:util";

const killTree = promisify(treeKill as (pid: number, signal: string, callback: (err?: Error) => void) => void);

export interface ProcessResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Global registry of all managed child processes.
 * Every process started via startProcess is tracked here
 * so that it can be cleaned up on backend shutdown.
 */
const managedProcesses = new Set<ChildProcess>();

export function runProcess(
  command: string,
  args: string[],
  options?: SpawnOptions,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      args,
      {
        ...options,
        // Enforce process-group policy on Unix for reliable termination, and shell only on Windows.
        shell: process.platform === "win32",
        detached: process.platform !== "win32",
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout?.on(
      "data",
      (data: Buffer) => {
        stdout += data.toString();
      },
    );

    child.stderr?.on(
      "data",
      (data: Buffer) => {
        stderr += data.toString();
      },
    );

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        exitCode: code ?? -1,
        stdout,
        stderr,
      });
    });
  });
}

export function startProcess(
  command: string,
  args: string[],
  options?: SpawnOptions,
): ChildProcess {
  const child = spawn(
    command,
    args,
      {
        ...options,
        // Enforce process-group policy on Unix for reliable termination, and shell only on Windows.
        shell: process.platform === "win32",
        detached: process.platform !== "win32",
      },
  );

  managedProcesses.add(child);

  child.on("exit", () => {
    managedProcesses.delete(child);
  });

  return child;
}

const activeStops = new WeakMap<ChildProcess, Promise<void>>();

export function stopProcess(
  childProcess: ChildProcess,
): Promise<void> {
  if (activeStops.has(childProcess)) {
    return activeStops.get(childProcess)!;
  }

  const promise = (async () => {
    try {
      if (!childProcess.pid || childProcess.killed || !managedProcesses.has(childProcess)) {
        managedProcesses.delete(childProcess);
        return;
      }

      const pid = childProcess.pid;

      try {
        if (process.platform === "win32") {
          await killTree(pid, "SIGTERM");
        } else {
          process.kill(-pid, "SIGTERM");
        }
      } catch {
        // Ignored, might have already exited
      }

      // Grace period
      let waited = 0;
      while (managedProcesses.has(childProcess) && waited < 2000) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
      }

      if (managedProcesses.has(childProcess)) {
        try {
          if (process.platform === "win32") {
            await killTree(pid, "SIGKILL");
          } else {
            process.kill(-pid, "SIGKILL");
          }
        } catch {
          // Ignored
        }
      }

      managedProcesses.delete(childProcess);
    } finally {
      activeStops.delete(childProcess);
    }
  })();

  activeStops.set(childProcess, promise);
  return promise;
}

/**
 * Forcefully kill a process tree or group without a grace period.
 * Used for escalation if a port remains bound.
 */
export async function forceKillProcess(childProcess: ChildProcess): Promise<void> {
  if (!childProcess.pid) return;
  try {
    if (process.platform === "win32") {
      await killTree(childProcess.pid, "SIGKILL");
    } else {
      process.kill(-childProcess.pid, "SIGKILL");
    }
  } catch {
    // Ignored, may have already exited
  }
}

/**
 * Terminate every managed child process.
 * Called during graceful shutdown to prevent orphaned preview servers.
 */
export async function stopAllProcesses(): Promise<void> {
  const processes = Array.from(managedProcesses);
  await Promise.allSettled(processes.map((child) => stopProcess(child)));
}

/**
 * Register graceful shutdown handlers.
 * Ensures all managed child processes are terminated
 * before the backend exits.
 */
function registerShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(
      `\n[Process Manager] Received ${signal}, stopping all managed processes...`,
    );
    await stopAllProcesses();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

registerShutdownHandlers();
