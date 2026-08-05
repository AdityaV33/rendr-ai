import type { GenerationState } from "../state.js";
import type { ValidatorService } from "../../validator/validator.service.js";

/**
 * ValidatorNode: Responsible for validating the generated source code
 * components and identifying errors.
 */
export class ValidatorNode {
  constructor(private readonly validatorService: ValidatorService) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    // Delegate to the existing Phase 6 validator service
    await this.validatorService.execute();
    
    return {
      ...state,
    };
  }
}
