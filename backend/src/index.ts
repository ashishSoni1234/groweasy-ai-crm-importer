import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import importRouter from './routes/import';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS — allow frontend (Next.js on port 3000) to call this API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────

// Mount the import router under /api
app.use('/api', importRouter);

// Root endpoint — quick sanity check
app.get('/', (_req, res) => {
  res.json({
    name: 'GrowEasy AI CRM Importer API',
    version: '1.0.0',
    endpoints: {
      import: 'POST /api/import',
      health: 'GET /api/health',
    },
  });
});

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   GrowEasy AI CRM Importer — Backend Running     ║
║   Port: ${PORT}                                      ║
║   Model: llama-3.3-70b-versatile (via Groq)      ║
╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
