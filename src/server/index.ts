import express from 'express';
import { registerRoutes } from './routes.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export function createApp(): express.Express {
const app = express();
  app.use(express.json());

  const staticPath = join(process.cwd(), 'dist', 'client');
  const indexPath = join(staticPath, 'index.html');

  // API routes first
  registerRoutes(app);

  // Root route
  app.get('/', async (_req, res) => {
    try {
      const content = await readFile(indexPath, 'utf-8');
      res.type('html').send(content);
    } catch {
      res.status(500).send('Cannot load index.html');
    }
  });

  // Static files
  app.use(express.static(staticPath));

  return app;
}
