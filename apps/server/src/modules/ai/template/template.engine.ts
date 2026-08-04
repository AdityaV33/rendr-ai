import { GeneratedFile } from '../types/generated-file.types.js';
import { templateStrategyRegistry } from './registry.js';
import { TemplateContext } from './template.types.js';

export class TemplateEngine {
  constructor(
    private readonly registry: typeof templateStrategyRegistry = templateStrategyRegistry
  ) {}

  /**
   * Generates all deterministic boilerplate files based on the given context.
   * It dynamically resolves the strategy using the context's framework.
   */
  public generateAll(context: TemplateContext): GeneratedFile[] {
    const strategy = this.registry.getStrategy(context.framework);
    const files: GeneratedFile[] = [];

    files.push(...strategy.generatePackageJson(context));
    files.push(...strategy.generateTsConfig(context));
    files.push(...strategy.generateFrameworkConfigs(context));
    files.push(...strategy.generateBoilerplate(context));
    files.push(...strategy.generateEntryFiles(context));

    return files;
  }
}
