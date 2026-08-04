import { FrameworkTemplateStrategy } from './template.interface.js';
import { SupportedFramework } from './template.types.js';
import { ReactViteStrategy } from './strategies/react-vite.strategy.js';
import { VanillaStrategy } from './strategies/vanilla.strategy.js';

export class TemplateStrategyRegistry {
  private readonly strategies: Map<SupportedFramework, FrameworkTemplateStrategy>;

  constructor() {
    this.strategies = new Map<SupportedFramework, FrameworkTemplateStrategy>();
    this.registerStrategy(new ReactViteStrategy());
    this.registerStrategy(new VanillaStrategy());
  }

  private registerStrategy(strategy: FrameworkTemplateStrategy): void {
    this.strategies.set(strategy.framework, strategy);
  }

  public getStrategy(framework: SupportedFramework): FrameworkTemplateStrategy {
    const strategy = this.strategies.get(framework);
    if (!strategy) {
      throw new Error(`Strategy for framework '${framework}' not found`);
    }
    return strategy;
  }
}

export const templateStrategyRegistry = new TemplateStrategyRegistry();
