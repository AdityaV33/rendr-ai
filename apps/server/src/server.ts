import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { cleanupOrphanedProjects } from './modules/projects/project.service.js';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    await cleanupOrphanedProjects();

    app.listen(env.PORT, () => {
      console.log(`RendrAI server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server');
    console.error(error);

    process.exit(1);
  }
};

startServer();