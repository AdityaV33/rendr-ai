import { GeneratedFile } from '../types/generated-file.types.js';
import { SupportedFramework, TemplateContext } from './template.types.js';

export interface FrameworkTemplateStrategy {
  readonly framework: SupportedFramework;

  generatePackageJson(context: TemplateContext): GeneratedFile[];
  generateTsConfig(context: TemplateContext): GeneratedFile[];
  generateFrameworkConfigs(context: TemplateContext): GeneratedFile[];
  generateBoilerplate(context: TemplateContext): GeneratedFile[];
  generateEntryFiles(context: TemplateContext): GeneratedFile[];
}
