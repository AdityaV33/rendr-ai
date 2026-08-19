import test from 'node:test';
import assert from 'node:assert/strict';
import { RepairEngineService } from './repair-engine.service.js';
import type { GeminiService } from '../clients/gemini.service.js';
import type { GenerationState } from '../graph/state.js';
import type { ParsedDiagnostic } from './repair.types.js';

test('RepairEngineService - Structural Targeting Rules', async (t) => {
  const mockGemini = {
    generateStructured: async () => ({ files: [] })
  } as unknown as GeminiService;

  const service = new RepairEngineService(mockGemini);
  
  const state: GenerationState = {
    prompt: '', 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: { id: 'test', userId: 'user', applicationType: 'test', title: 'Test', createdAt: new Date(), updatedAt: new Date() } as any,
    currentStep: 'planner', status: 'completed', errors: [], executionHistory: [], checkpoints: [], metrics: { plannerMs: 0, architectMs: 0, generatorMs: 0, validationMs: 0, repairMs: 0, totalMs: 0, architectRetries: 0 },
    architecture: { stack: { language: 'TypeScript', frontendFramework: 'react-vite', buildTool: 'vite', packageManager: 'npm' }, strategies: [], dependencies: [], fileStructure: [], componentContracts: [], behavioralContracts: [] },
    generatedFiles: {
      commands: { install: 'npm i', build: 'npm build', dev: 'npm dev' }, project: { framework: 'react-vite', language: 'TypeScript', packageManager: 'npm', outputDirectory: 'dist' },
      files: [
        { path: 'src/components/LandmarkExplorer.tsx', content: 'import { ImportedDep } from "./ImportedDep";\nexport const LandmarkExplorer = () => <div/>;' },
        { path: 'src/components/KPICards.tsx', content: 'export interface KPICards { type: string; date: string; }' },
        { path: 'src/components/ImportedDep.tsx', content: 'export const ImportedDep = () => <div/>;' },
      ]
    }
  };

  const diagnostics: ParsedDiagnostic[] = [
    { tool: 'tsc', category: 'contract', code: 'TS2724', file: 'src/components/LandmarkExplorer.tsx', message: 'error TS2724: Type Date KPICards' }
  ];

  let capturedPrompt = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockGemini.generateStructured = async <T>(prompt: string, schema: any, system: string): Promise<T> => {
    capturedPrompt = prompt + system;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { files: [] } as any;
  };

  await service.executeGateRepair(state, 'Build', 'Raw Error', diagnostics);

  const getEditableFilesSection = (promptText: string) => promptText.substring(promptText.indexOf('Editable Files'), promptText.indexOf('Read-Only') > 0 ? promptText.indexOf('Read-Only') : promptText.length);
  const getReadonlyFilesSection = (promptText: string) => promptText.includes('Read-Only Context Files') ? promptText.substring(promptText.indexOf('Read-Only Context Files')) : '';

  const editableFilesStr = getEditableFilesSection(capturedPrompt);
  const readonlyFilesStr = getReadonlyFilesSection(capturedPrompt);

  await t.test('diagnostic-only file is editable', () => {
    assert.ok(editableFilesStr.includes('src/components/LandmarkExplorer.tsx'), 'LandmarkExplorer should be editable as it is directly diagnosed.');
  });

  await t.test('symbol-match-only KPICards is context-only and absent from editable', () => {
    assert.ok(!editableFilesStr.includes('src/components/KPICards.tsx'), 'KPICards should NOT be editable.');
    assert.ok(readonlyFilesStr.includes('src/components/KPICards.tsx'), 'KPICards should be in read-only context.');
  });

  await t.test('ordinary imported dependency is not automatically editable merely because it is imported', () => {
    assert.ok(!editableFilesStr.includes('src/components/ImportedDep.tsx'), 'ImportedDep should NOT be editable just because it is imported.');
    assert.ok(readonlyFilesStr.includes('src/components/ImportedDep.tsx'), 'ImportedDep should be in read-only context.');
  });

  await t.test('prompt labels context-only files as read-only', () => {
    assert.ok(capturedPrompt.includes('Read-Only Context Files'), 'Section header must exist.');
    assert.ok(capturedPrompt.includes('You MAY NOT modify these files'), 'Explicit warning must exist.');
    assert.ok(capturedPrompt.includes('Do not modify "Read-Only Context Files"'), 'System prompt constraint must exist.');
  });
});
