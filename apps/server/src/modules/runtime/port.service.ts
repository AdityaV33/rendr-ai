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
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, "0.0.0.0");
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