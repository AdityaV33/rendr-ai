const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
dotenv.config({ path: '.env' });

if (process.env.ENABLE_DNS_WORKAROUND) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  
  const project = await Project.findOne({ prompt: { $regex: /todo/i } }).sort({ createdAt: -1 }).lean();
  
  if (!project) {
    console.log('No project found');
    process.exit(1);
  }
  
  console.log('Project ID:', project._id);
  
  const fs = require('fs');
  fs.writeFileSync('dump.json', JSON.stringify({
    id: project._id,
    prompt: project.prompt,
    aiPlan: project.aiPlan,
    architecturePlan: project.architecturePlan,
    generatedProject: project.generatedProject
  }, null, 2));
  console.log('Dumped to dump.json');
  
  process.exit(0);
}
run().catch(console.error);
