import test from 'node:test';
import assert from 'node:assert/strict';
import { ProjectModel } from './project.model.js';
import * as projectService from './project.service.js';
import { ConflictError, NotFoundError } from '../lib/http-error.js';

test('Project Service - Concurrency Control', async (t) => {
  t.beforeEach(() => {
    t.mock.restoreAll();
  });

  await t.test('10 concurrent generation attempts yield 1 success and 9 conflicts', async (tContext) => {
    let callCount = 0;
    const mockProject = { _id: 'proj123', status: 'generating' };
    
    // Mock findOneAndUpdate to only return the project the first time it is called
    tContext.mock.method(ProjectModel, 'findOneAndUpdate', async () => {
      // simulate race condition by adding small delay
      await new Promise(r => setTimeout(r, 10));
      callCount++;
      if (callCount === 1) {
        return mockProject;
      }
      return null; 
    });
    
    tContext.mock.method(ProjectModel, 'exists', async () => true);

    const owner = 'user123';
    const projectId = 'proj123';

    // Fire 10 concurrent requests
    const promises = Array.from({ length: 10 }).map(() => projectService.startGeneration(owner, projectId));
    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    
    assert.equal(fulfilled.length, 1, 'Exactly one claim must succeed');
    assert.equal(rejected.length, 9, 'Exactly nine claims must be rejected');
    
    const errors = rejected.map(r => (r as PromiseRejectedResult).reason);
    assert.ok(errors.every(e => e instanceof ConflictError), 'All rejections must be ConflictErrors');
  });

  await t.test('different user cannot claim another users project', async (tContext) => {
    tContext.mock.method(ProjectModel, 'findOneAndUpdate', async () => null);
    tContext.mock.method(ProjectModel, 'exists', async () => false);

    await assert.rejects(projectService.startGeneration('wrong-owner', 'proj123'), NotFoundError);
  });

  await t.test('project not already generating can start normally', async (tContext) => {
    tContext.mock.method(ProjectModel, 'findOneAndUpdate', async () => ({ _id: 'proj123', status: 'generating' }));
    
    const project = await projectService.startGeneration('owner', 'proj123');
    assert.equal(project._id, 'proj123');
  });
  
  await t.test('after terminal status is set, a later generation can start again', async (tContext) => {
      tContext.mock.method(ProjectModel, 'findOneAndUpdate', async (query: { status: { $in: string[] } }) => {
          // Verify that query uses $in: ["draft", "ready", "failed"]
          assert.ok(query.status.$in.includes('failed'));
          return { _id: 'proj123', status: 'generating' };
      });
      
      const project = await projectService.startGeneration('owner', 'proj123');
      assert.equal(project._id, 'proj123');
  });
});
