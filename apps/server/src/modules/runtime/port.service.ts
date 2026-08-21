import net from "node:net";

import {
  PREVIEW_PORT_END,
  PREVIEW_PORT_START,
} from "./runtime.constants.js";

const reservedPorts = new Set<number>();

/**
 * Check whether a port is actually available at the OS level
 * by attempting to bind a temporary TCP server to it.
 */
function checkPortAvailable(
  port: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    // 1. Check if we can connect to 127.0.0.1
    // If we can, it means the port is in use (e.g. by another Vite instance)
    const socket = new net.Socket();
    
    let resolved = false;
    const cleanup = () => {
      if (!socket.destroyed) socket.destroy();
    };

    socket.setTimeout(200);

    socket.on("connect", () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(false); // Port is IN USE
    });

    socket.on("timeout", () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(false); // Assume in use on timeout
    });

    socket.on("error", (err: Error & { code?: string }) => {
      if (resolved) return;
      
      if (err.code === "ECONNREFUSED") {
        // 2. 127.0.0.1 is free. Now check if we can bind 0.0.0.0
        const server = net.createServer();
        server.once("error", () => {
          resolved = true;
          cleanup();
          resolve(false);
        });
        server.once("listening", () => {
          server.close(() => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(true); // Port is TRULY FREE
          });
        });
        server.listen(port, "0.0.0.0");
      } else {
        resolved = true;
        cleanup();
        resolve(false);
      }
    });

    socket.connect(port, "127.0.0.1");
  });
}

/**
 * Find and reserve an available port.
 * Checks both the in-memory reservation set and the OS.
 */
export async function getAvailablePort(): Promise<number> {
  for (
    let port = PREVIEW_PORT_START;
    port <= PREVIEW_PORT_END;
    port++
  ) {
    if (reservedPorts.has(port)) {
      continue;
    }

    const available =
      await checkPortAvailable(port);

    if (available) {
      reservedPorts.add(port);
      return port;
    }
  }

  throw new Error(
    "No preview ports available.",
  );
}

export function reservePort(
  port: number,
): void {
  reservedPorts.add(port);
}

export function releasePort(
  port: number,
): void {
  reservedPorts.delete(port);
}

export function isPortReserved(
  port: number,
): boolean {
  return reservedPorts.has(port);
}