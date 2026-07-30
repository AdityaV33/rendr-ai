import {
  ChildProcess,
  SpawnOptions,
  spawn,
  exec,
  execSync,
} from "node:child_process";
import os from "node:os";

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
        shell: true,
        ...options,
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
      shell: true,
      ...options,
    },
  );

  managedProcesses.add(child);

  child.on("exit", () => {
    managedProcesses.delete(child);
  });

  return child;
}

export function stopProcess(
  childProcess: ChildProcess,
): void {
  if (!childProcess.killed && childProcess.pid) {
    if (os.platform() === "win32") {
      exec(`taskkill /pid ${childProcess.pid} /t /f`, () => {
        // Ignore errors from taskkill
      });
    } else {
      childProcess.kill();
    }
  }

  managedProcesses.delete(childProcess);
}

/**
 * Terminate every managed child process.
 * Called during graceful shutdown to prevent orphaned preview servers.
 */
export function stopAllProcesses(): void {
  for (const child of managedProcesses) {
    if (!child.killed && child.pid) {
      if (os.platform() === "win32") {
        try {
          execSync(
            `taskkill /pid ${child.pid} /t /f`,
            { stdio: "ignore" },
          );
        } catch {
          // Process may have already exited
        }
      } else {
        child.kill("SIGTERM");
      }
    }
  }

  managedProcesses.clear();
}

/**
 * Register graceful shutdown handlers.
 * Ensures all managed child processes are terminated
 * before the backend exits.
 */
function registerShutdownHandlers(): void {
  const shutdown = (signal: string) => {
    console.log(
      `\n[Process Manager] Received ${signal}, stopping all managed processes...`,
    );
    stopAllProcesses();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

registerShutdownHandlers();