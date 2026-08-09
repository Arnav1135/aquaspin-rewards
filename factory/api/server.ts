import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { FactoryOrchestrator, JobType } from '../core/orchestrator';
import * as fs from 'fs';

const app = express();
app.use(express.json());

const orchestrator = new FactoryOrchestrator();

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardDir = path.join(__dirname, '..', 'dashboard');
const gamesDir = path.join(__dirname, '..', '..', 'src', 'games');

// Allow public access to dashboard
app.use('/dashboard', express.static(dashboardDir));
app.get('/dashboard', (req, res) => res.sendFile(path.join(dashboardDir, 'index.html')));

// Security middleware for API
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${process.env.FACTORY_API_KEY || 'dev-factory-key'}`) {
    return res.status(403).json({ error: 'Unauthorized Factory Access' });
  }
  next();
};

/**
 * ACTIVEPIECES AUTOMATION CONTROL PLANE
 */
app.use('/api', requireAuth);

app.post('/api/factory/jobs', (req, res) => {
  const { type, input, gameId } = req.body;
  if (!type) return res.status(400).json({ error: 'Job type required' });
  
  const jobId = orchestrator.createJob(type as JobType, input, gameId);
  orchestrator.executeJob(jobId); 
  
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/games', (req, res) => {
  const { input } = req.body;
  const jobId = orchestrator.createJob('CREATE_GAME', input);
  orchestrator.executeJob(jobId);
  res.json({ jobId, status: 'QUEUED' });
});

app.get('/api/factory/jobs', (req, res) => {
  // Sort descending by creation
  const jobs = orchestrator.getAllJobs().reverse();
  res.json(jobs);
});

app.get('/api/factory/jobs/:id', (req, res) => {
  const job = orchestrator.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.get('/api/factory/games', (req, res) => {
  // Scan the src/games directory for games
  let games: any[] = [];
  try {
    if (fs.existsSync(gamesDir)) {
      const folders = fs.readdirSync(gamesDir);
      games = folders.map(f => ({
        id: f,
        name: f.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      }));
    }
  } catch (e) {
    console.error('Failed to read games directory');
  }
  res.json(games);
});

app.post('/api/factory/games/:id/build', (req, res) => {
  const jobId = orchestrator.createJob('RUN_TESTS', { target: 'build' }, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/games/:id/test', (req, res) => {
  const jobId = orchestrator.createJob('RUN_TESTS', { target: 'test' }, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/games/:id/fix', (req, res) => {
  const jobId = orchestrator.createJob('FIX_BUG', req.body, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/games/:id/optimize', (req, res) => {
  const jobId = orchestrator.createJob('RUN_PERFORMANCE_TEST', { benchmark: true, optimize: true }, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/games/:id/upgrade', (req, res) => {
  const jobId = orchestrator.createJob('SCAN_GAME', { depth: 'full', applyUpgrades: true }, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/repository/scan', (req, res) => {
  const jobId = orchestrator.createJob('SCAN_REPOSITORY', { autoFix: req.body.autoFix ?? false });
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/deployment/preview', (req, res) => {
  // In a real app, this would trigger a Vercel preview deployment via Vercel API
  const jobId = orchestrator.createJob('RUN_TESTS', { target: 'deploy_preview' });
  res.json({ jobId, status: 'QUEUED', message: 'Preview deployment triggered' });
});

app.post('/api/factory/deployment/production', (req, res) => {
  // Triggers Vercel production deployment
  const jobId = orchestrator.createJob('RUN_TESTS', { target: 'deploy_production' });
  res.json({ jobId, status: 'QUEUED', message: 'Production deployment triggered' });
});

app.get('/api/factory/health', (req, res) => {
  res.json({ status: 'OK', jobsRunning: orchestrator.getAllJobs().filter(j => j.status === 'IMPLEMENTING' || j.status === 'TESTING').length });
});

app.get('/api/factory/games/:id', (req, res) => {
  const gamePath = path.join(gamesDir, req.params.id);
  if (fs.existsSync(gamePath)) {
    // Return basic game metadata
    res.json({ id: req.params.id, exists: true });
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

app.get('/api/factory/errors', (req, res) => {
  // Return all failed jobs
  const failedJobs = orchestrator.getAllJobs().filter(j => j.status === 'FAILED');
  res.json(failedJobs);
});

app.get('/api/factory/performance', (req, res) => {
  // Mock performance metrics for the control plane
  res.json({
    avgBuildTimeMs: 4500,
    successRate: 0.98,
    activeAgents: 2
  });
});

// SCHEDULED FACTORY JOBS (Milestone 14)
setInterval(() => {
  console.log('[Factory Scheduler] Running daily health scan...');
  orchestrator.createJob('SCAN_REPOSITORY', { autoFix: false });
}, 1000 * 60 * 60 * 24); // Daily

setInterval(() => {
  console.log('[Factory Scheduler] Running weekly bug and performance scan...');
  orchestrator.createJob('SCAN_GAME', { depth: 'full' });
  orchestrator.createJob('RUN_PERFORMANCE_TEST', { benchmark: true });
}, 1000 * 60 * 60 * 24 * 7); // Weekly

const PORT = process.env.FACTORY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Factory Orchestrator] API Control Plane listening on port ${PORT}`);
  console.log(`[Factory Orchestrator] Dashboard available at http://localhost:${PORT}/dashboard`);
});
