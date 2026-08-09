import express from 'express';
import { FactoryOrchestrator, JobType } from '../core/orchestrator';

const app = express();
app.use(express.json());

const orchestrator = new FactoryOrchestrator();

// Security middleware to ensure only Activepieces/authorized clients can trigger jobs
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${process.env.FACTORY_API_KEY || 'dev-factory-key'}`) {
    return res.status(403).json({ error: 'Unauthorized Factory Access' });
  }
  next();
};

app.use(requireAuth);

/**
 * ACTIVEPIECES AUTOMATION CONTROL PLANE
 */

app.post('/api/factory/jobs', (req, res) => {
  const { type, input, gameId } = req.body;
  if (!type) return res.status(400).json({ error: 'Job type required' });
  
  const jobId = orchestrator.createJob(type as JobType, input, gameId);
  orchestrator.executeJob(jobId); // Async handoff
  
  res.json({ jobId, status: 'QUEUED' });
});

app.get('/api/factory/jobs/:id', (req, res) => {
  const job = orchestrator.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.post('/api/factory/games/:id/build', (req, res) => {
  const jobId = orchestrator.createJob('RUN_TESTS', { target: 'build' }, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.post('/api/factory/games/:id/fix', (req, res) => {
  const jobId = orchestrator.createJob('FIX_BUG', req.body, req.params.id);
  res.json({ jobId, status: 'QUEUED' });
});

app.get('/api/factory/health', (req, res) => {
  res.json({ status: 'OK', jobsRunning: orchestrator.getAllJobs().filter(j => j.status === 'IMPLEMENTING' || j.status === 'TESTING').length });
});

const PORT = process.env.FACTORY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Factory Orchestrator] API Control Plane listening on port ${PORT}`);
});
