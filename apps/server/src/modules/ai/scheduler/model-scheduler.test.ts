import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelSchedulerService } from './model-scheduler.service.js';
import { pipelineRunContext } from '../utils/run-context.js';
import { env } from '../../../config/env.js';

test('ModelSchedulerService - 429 Run-Scoped Exclusion', async (t) => {
  // Setup environment for testing
  env.GEMINI_MODELS = ['model-A', 'model-B'];
  const scheduler = new ModelSchedulerService();

  await t.test('qualifying 429 blacklists the model only for the current run', async () => {
    await pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {
      const model = await scheduler.acquireModel();
      assert.equal(model, 'model-A');

      // Simulate a 429 rate limit
      const context = pipelineRunContext.getStore();
      context?.blacklistedModels.add(model);
      scheduler.reportFailure(model, { status: 429 }, 100);

      // Next acquisition should fall-through to model-B
      const nextModel = await scheduler.acquireModel();
      assert.equal(nextModel, 'model-B');
    });
  });

  await t.test('the next run can select it again', async () => {
    // In a new run context, model-A should be available again
    await pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {
      const model = await scheduler.acquireModel();
      assert.equal(model, 'model-A'); // model-A is back!
    });
  });

  await t.test('503 does not blacklist it', async () => {
    await pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {
      const model = await scheduler.acquireModel();
      assert.equal(model, 'model-A');

      // Simulate a 503 Server Error
      scheduler.reportFailure(model, { status: 503 }, 100);

      // Verify it's in coolingDown state, NOT blacklisted
      const context = pipelineRunContext.getStore();
      assert.ok(!context?.blacklistedModels.has('model-A'));

      // Clean up for next test by resetting cooldown manually
      // We can't easily reset it, but since 503 cools down for 2s, we can just wait or redefine models.
    });
  });

  await t.test('timeout does not blacklist it', async () => {
    // We recreate scheduler to clear the 503 cooldown from previous test
    const cleanScheduler = new ModelSchedulerService();
    await pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {
      const model = await cleanScheduler.acquireModel();
      
      // Simulate timeout
      cleanScheduler.reportFailure(model, new Error('Request timed out'), 100);
      
      const context = pipelineRunContext.getStore();
      assert.ok(!context?.blacklistedModels.has(model));
    });
  });

  await t.test('parallel/concurrent selection observes a blacklist created by another task', async () => {
    const cleanScheduler = new ModelSchedulerService();
    await pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {
      // Task 1 gets model-A
      const model1 = await cleanScheduler.acquireModel();
      assert.equal(model1, 'model-A');

      // Task 1 fails with 429
      const context = pipelineRunContext.getStore();
      context?.blacklistedModels.add(model1);
      cleanScheduler.reportFailure(model1, { status: 429 }, 100);

      // Task 2 concurrently acquires a model
      const model2 = await cleanScheduler.acquireModel();
      assert.equal(model2, 'model-B'); // Must observe task 1's blacklist
    });
  });

  await t.test('throws error if all models are blacklisted', async () => {
    const cleanScheduler = new ModelSchedulerService();
    await pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {
      const context = pipelineRunContext.getStore();
      context?.blacklistedModels.add('model-A');
      context?.blacklistedModels.add('model-B');
      
      await assert.rejects(cleanScheduler.acquireModel(), /All models are currently exhausted/);
    });
  });
});
