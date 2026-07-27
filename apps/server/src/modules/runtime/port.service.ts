import {
  PREVIEW_PORT_END,
  PREVIEW_PORT_START,
} from "./runtime.constants.js";

const reservedPorts = new Set<number>();

export function getAvailablePort(): number {
  for (
    let port = PREVIEW_PORT_START;
    port <= PREVIEW_PORT_END;
    port++
  ) {
    if (!reservedPorts.has(port)) {
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