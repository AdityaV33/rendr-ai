import type { ChildProcess } from "node:child_process";
import * as processService from "./process.service.js";

export class DevServerManager {
  private static instance: DevServerManager;
  private activeServers = new Map<string, { process: ChildProcess, url: string }>();

  private constructor() {}

  static getInstance(): DevServerManager {
    if (!DevServerManager.instance) {
      DevServerManager.instance = new DevServerManager();
    }
    return DevServerManager.instance;
  }

  async startServer(projectId: string, workspacePath: string, port = 5173): Promise<{ startupMs: number }> {
    if (this.activeServers.has(projectId)) {
      // Server already running for this project
      return { startupMs: 0 };
    }

    const url = `http://localhost:${port}`;
    const start = performance.now();
    
    const child = processService.startProcess("pnpm", ["run", "dev", "--port", port.toString(), "--strictPort"], { 
      cwd: workspacePath,
      stdio: 'ignore' // We don't need to clog our stdout with Vite logs
    });

    child.on('error', (err) => {
      console.error(`[DevServer] Failed to start Vite for ${projectId}:`, err);
    });

    child.on('exit', (_code) => {
      this.activeServers.delete(projectId);
    });

    this.activeServers.set(projectId, { process: child, url });

    // Wait for the server to be ready
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 150) { // wait up to 30s
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 200 || res.status === 404) {
          isReady = true;
          break;
        }
      } catch {
        // Ignore fetch errors while waiting
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }

    if (!isReady) {
      processService.stopProcess(child).catch(() => {});
      this.activeServers.delete(projectId);
      throw new Error(`Dev server failed to start within 30s on ${url}`);
    }

    const startupMs = performance.now() - start;
    return { startupMs };
  }

  async stopServer(projectId: string): Promise<void> {
    const server = this.activeServers.get(projectId);
    if (server) {
      this.activeServers.delete(projectId);
      await processService.stopProcess(server.process);
    }
  }
}

export const devServerManager = DevServerManager.getInstance();
