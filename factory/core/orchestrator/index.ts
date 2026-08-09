import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type JobType = 
  | 'CREATE_GAME' | 'UPDATE_GAME' | 'FIX_BUG' | 'SCAN_REPOSITORY' 
  | 'SCAN_GAME' | 'OPTIMIZE_GAME' | 'OPTIMIZE_ASSETS' | 'UPGRADE_GRAPHICS' 
  | 'UPGRADE_ANIMATION' | 'UPGRADE_AUDIO' | 'RUN_TESTS' 
  | 'RUN_PERFORMANCE_TEST' | 'PREPARE_RELEASE' | 'DEPLOY_PREVIEW' 
  | 'DEPLOY_PRODUCTION';

export type JobState = 
  | 'QUEUED' | 'PLANNING' | 'IMPLEMENTING' | 'TESTING' | 'FIXING' 
  | 'OPTIMIZING' | 'VALIDATING' | 'READY' | 'DEPLOYING' 
  | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

export interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

export interface Job {
  id: string;
  type: JobType;
  gameId?: string;
  repositoryState: string; // e.g. commit hash or branch
  input: any;
  status: JobState;
  logs: JobLog[];
  steps: string[];
  errors: any[];
  retryCount: number;
  result?: any;
  artifacts: string[];
}

export class FactoryOrchestrator {
  private jobs: Map<string, Job> = new Map();
  private dbPath: string;

  constructor(dbPath: string = path.join(process.cwd(), 'factory', 'core', 'orchestrator', 'jobs.json')) {
    this.dbPath = dbPath;
    this.loadJobs();
  }

  private loadJobs() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.jobs = new Map(Object.entries(parsed));
      } catch (e) {
        console.error('Failed to load jobs DB', e);
      }
    }
  }

  private saveJobs() {
    try {
      const obj = Object.fromEntries(this.jobs);
      fs.writeFileSync(this.dbPath, JSON.stringify(obj, null, 2));
    } catch (e) {
      console.error('Failed to save jobs DB', e);
    }
  }

  public createJob(type: JobType, input: any, gameId?: string): string {
    const id = randomUUID();
    const job: Job = {
      id,
      type,
      gameId,
      repositoryState: 'HEAD',
      input,
      status: 'QUEUED',
      logs: [],
      steps: [],
      errors: [],
      retryCount: 0,
      artifacts: []
    };
    
    this.jobs.set(id, job);
    this.log(id, 'info', `Job created: ${type}`);
    this.saveJobs();
    
    return id;
  }

  public getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  public updateJobState(id: string, newState: JobState) {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    
    const oldState = job.status;
    job.status = newState;
    this.log(id, 'info', `State transitioned: ${oldState} -> ${newState}`);
    this.saveJobs();
  }

  public log(id: string, level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    const job = this.jobs.get(id);
    if (!job) return;
    
    const logEntry: JobLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };
    
    job.logs.push(logEntry);
    console.log(`[${id}][${level.toUpperCase()}] ${message}`);
    this.saveJobs();
  }

  public failJob(id: string, error: any) {
    const job = this.jobs.get(id);
    if (!job) return;
    
    job.errors.push(error);
    this.log(id, 'error', `Job failed with error`, error);
    this.updateJobState(id, 'FAILED');
  }

  // Future integration point for Activepieces or Event Bus
  public async executeJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    
    try {
      this.updateJobState(id, 'PLANNING');
      // Logic for handing off to AI planner would go here
      // ...
    } catch (error) {
      this.failJob(id, error);
    }
  }
}
