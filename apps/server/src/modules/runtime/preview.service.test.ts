import test from 'node:test';
import assert from 'node:assert/strict';
import * as previewService from './preview.service.js';
import * as portService from './port.service.js';
import * as processService from './process.service.js';

test('Preview Service - Port Release Semantics', async (t) => {
  await t.test('preview port release occurs only after port probe observes it as available', async () => {
    // We mock checkPortAvailable or we actually bind a port to test it.
    // It's easier to mock `checkPortAvailable` for tests if we can, but since it's exported:
    
    const port = 45000;
    portService.reservePort(port);
    
    // Simulate a process
    const cp = processService.startProcess('sleep', ['10'], { shell: true });
    
    // Create a mock preview result
    const preview = {
      port,
      url: `http://localhost:${port}`,
      process: cp
    };
    
    assert.equal(portService.isPortReserved(port), true);
    
    // Stop the preview
    await previewService.stopPreview(preview);
    
    // Since the process actually dies, the port should be free (it was never bound by sleep anyway)
    assert.equal(portService.isPortReserved(port), false, 'Port should be released after successful stop and probe');
  });

  await t.test('port-still-bound path triggers final cleanup attempt and second probe', async () => {
    const net = await import('node:net');
    const server = net.createServer();
    const port = 45001;
    
    await new Promise<void>((resolve) => {
      server.listen(port, '0.0.0.0', () => resolve());
    });
    
    portService.reservePort(port);
    const cp = processService.startProcess('sleep', ['10'], { shell: true });
    
    const preview = {
      port,
      url: `http://localhost:${port}`,
      process: cp
    };
    
    // We will start stopPreview. During its execution, the first probe will fail because the server is listening.
    // stopPreview will then escalate and do a second probe (with a 2000ms timeout).
    // If we close the server 500ms after calling stopPreview, the second probe should succeed!
    const stopPromise = previewService.stopPreview(preview);
    
    setTimeout(() => {
      server.close();
    }, 500);
    
    await stopPromise;
    
    // Because the second probe succeeded, the port MUST be released.
    assert.equal(portService.isPortReserved(port), false, 'Port MUST be released after second probe succeeds');
  });

  await t.test('failed tree termination / bounded timeout preserves clear error state and does not release port', async () => {
    // Start an actual TCP server to permanently bind the port so BOTH probes fail
    const net = await import('node:net');
    const server = net.createServer();
    const port = 45002;
    
    await new Promise<void>((resolve) => {
      server.listen(port, '0.0.0.0', () => resolve());
    });
    
    portService.reservePort(port);
    const cp = processService.startProcess('sleep', ['10'], { shell: true });
    
    const preview = {
      port,
      url: `http://localhost:${port}`,
      process: cp
    };
    
    await previewService.stopPreview(preview);
    
    // The port is actively bound permanently by our net.Server, so `waitForPortRelease` will time out twice.
    // The reserved status MUST remain true.
    assert.equal(portService.isPortReserved(port), true, 'Port MUST remain reserved if it remains bound after graceful and forceful shutdown');
    
    // Cleanup
    portService.releasePort(port);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
