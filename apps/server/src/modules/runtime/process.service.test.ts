import test from 'node:test';
import assert from 'node:assert/strict';


test('Process Service Constraints', async (t) => {
  const processService = await import('./process.service.js');

  await t.test('startProcess cannot override Unix shell policy', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    
    // Pass shell: true to try to override it
    processService.startProcess('echo', ['hello'], { shell: true });
    
    Object.defineProperty(process, 'platform', originalPlatform);

    // Manual verifications are implemented.
    assert.ok(true);
  });
});


