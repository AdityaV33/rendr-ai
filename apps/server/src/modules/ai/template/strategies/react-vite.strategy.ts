import { GeneratedFile } from '../../types/generated-file.types.js';
import { FrameworkTemplateStrategy } from '../template.interface.js';
import { SupportedFramework, TemplateContext } from '../template.types.js';

export class ReactViteStrategy implements FrameworkTemplateStrategy {
  readonly framework: SupportedFramework = 'react-vite';

  generatePackageJson(_context: TemplateContext): GeneratedFile[] {
    return [];
  }

  generateTsConfig(_context: TemplateContext): GeneratedFile[] {
    return [];
  }

  generateFrameworkConfigs(_context: TemplateContext): GeneratedFile[] {
    return [];
  }

  generateBoilerplate(_context: TemplateContext): GeneratedFile[] {
    return [];
  }

  generateEntryFiles(_context: TemplateContext): GeneratedFile[] {
    return [];
  }
}
