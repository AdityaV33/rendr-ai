import { GeminiService } from "../clients/gemini.service.js";
import { PlannerService } from "../planner/planner.service.js";
import { ArchitectService } from "../architect/architect.service.js";
import { GeneratorV2Service } from "../generator/generator-v2.service.js";
import { TemplateEngine } from "../template/template.engine.js";
import { SanityGateService } from "../validator/sanity-gate.service.js";
import { RepairEngineService } from "../repair/repair-engine.service.js";

import { PlannerNode } from "./nodes/planner.node.js";
import { ArchitectNode } from "./nodes/architect.node.js";
import { GeneratorNode } from "./nodes/generator.node.js";
import { GateRunnerNode } from "./nodes/gate-runner.node.js";

import { GenerationGraph } from "./graph.js";

export function createGenerationGraph(geminiService: GeminiService): GenerationGraph {
    // 1. Create base services and engines
    const templateEngine = new TemplateEngine();

    // 2. Create AI pipeline services
    const plannerService = new PlannerService(geminiService);
    const architectService = new ArchitectService(geminiService);
    const generatorV2Service = new GeneratorV2Service(geminiService, templateEngine);
    const sanityGateService = new SanityGateService();
    const repairEngineService = new RepairEngineService(geminiService);

    // 3. Create graph nodes wrapping the services
    const plannerNode = new PlannerNode(plannerService);
    const architectNode = new ArchitectNode(architectService);
    const generatorNode = new GeneratorNode(generatorV2Service);
    const gateRunnerNode = new GateRunnerNode(sanityGateService, repairEngineService);

    // 4. Create and return the graph
    return new GenerationGraph(
      plannerNode,
      architectNode,
      generatorNode,
      gateRunnerNode
    );
  }
