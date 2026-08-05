import { GeminiService } from "../clients/gemini.service.js";
import { PlannerService } from "../planner/planner.service.js";
import { ArchitectService } from "../architect/architect.service.js";
import { GeneratorService } from "../generator/generator.service.js";
import { ValidatorService } from "../validator/validator.service.js";
import { TemplateEngine } from "../template/template.engine.js";

import { PlannerNode } from "./nodes/planner.node.js";
import { ArchitectNode } from "./nodes/architect.node.js";
import { GeneratorNode } from "./nodes/generator.node.js";
import { ValidatorNode } from "./nodes/validator.node.js";

import { GenerationGraph } from "./graph.js";

export function createGenerationGraph(geminiService: GeminiService): GenerationGraph {
    // 1. Create base services and engines
    const templateEngine = new TemplateEngine();

    // 2. Create AI pipeline services
    const plannerService = new PlannerService(geminiService);
    const architectService = new ArchitectService(geminiService);
    const generatorService = new GeneratorService(geminiService, templateEngine);
    const validatorService = new ValidatorService();

    // 3. Create graph nodes wrapping the services
    const plannerNode = new PlannerNode(plannerService);
    const architectNode = new ArchitectNode(architectService);
    const generatorNode = new GeneratorNode(generatorService);
    const validatorNode = new ValidatorNode(validatorService);

    // 4. Create and return the graph
    return new GenerationGraph(
      plannerNode,
      architectNode,
      generatorNode,
      validatorNode
    );
  }
