import {
  ChildProcess,
  SpawnOptions,
  spawn,
} from "node:child_process";

export interface ProcessResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

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
  return spawn(
    command,
    args,
    {
      shell: true,
      ...options,
    },
  );
}