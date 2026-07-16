import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

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