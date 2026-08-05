const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
import('./dist/modules/ai/ai.service.js').then(async m => {
  const service = m.aiService;
  
  service.graph.plannerNode.execute = async (s) => s;
  service.graph.architectNode.execute = async (s) => s;
  service.graph.generatorNode.execute = async (s) => s;
  service.graph.validatorNode.execute = async (s) => s;
  
  try {
    await service.generate({ prompt: 'test' });
  } catch (e) {
    // Expected to fail at the end because we didn't generate valid artifacts,
    // but the events up to validator_completed should fire.
  }
}).catch(console.error);
