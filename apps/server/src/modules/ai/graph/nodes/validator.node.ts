import type { GenerationState } from "../state.js";
import type { ValidatorService } from "../../validator/validator.service.js";

/**
 * ValidatorNode: Responsible for validating the generated source code
 * components and identifying errors.
 */
export class ValidatorNode {
  constructor(private readonly validatorService: ValidatorService) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    const validationResult = await this.validatorService.execute(state);
    
    return {
      ...state,
      validationResult,
    };
  }
}
