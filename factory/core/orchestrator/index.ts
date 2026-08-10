import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { GitHubManager } from '../github/GitHubManager.js';
import { GameSDK } from '../sdk/GameSDK.js';
import { AssetPipeline } from '../assets/AssetPipeline.js';
import { RegistryManager } from '../../games/registry/RegistryManager.js';
import { AIDebugger } from '../../ai/debugger/AIDebugger.js';
import { PerformanceEngine } from '../../qa/performance/PerformanceEngine.js';

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
  private github: GitHubManager;

  constructor(dbPath: string = path.join(process.cwd(), 'factory', 'core', 'orchestrator', 'jobs.json')) {
    this.dbPath = dbPath;
    this.github = new GitHubManager();
    this.loadJobs();
  }

  /**
   * Event Bus implementation that broadcasts to Activepieces
   */
  public emitEvent(eventName: string, payload: any) {
    console.log(`[Event Bus] Emitting: ${eventName}`);
    const activepiecesUrl = process.env.ACTIVEPIECES_WEBHOOK_URL;
    if (activepiecesUrl) {
      fetch(activepiecesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, payload })
      }).catch(err => {
        console.error('[Event Bus] Failed to emit event to Activepieces', err);
      });
    }
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
    
    // Map job types to specific prompt events
    if (type === 'CREATE_GAME') this.emitEvent('GAME_REQUESTED', { jobId: id, input });
    if (type === 'RUN_TESTS' && input?.target === 'build') this.emitEvent('BUILD_STARTED', { jobId: id, gameId });
    if (type === 'DEPLOY_PRODUCTION' || type === 'DEPLOY_PREVIEW') this.emitEvent('DEPLOYMENT_STARTED', { jobId: id, gameId });
    
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

    // Map state transitions to Activepieces events
    if (newState === 'COMPLETED') {
      if (job.type === 'CREATE_GAME') this.emitEvent('GAME_CREATED', { jobId: id, gameId: job.gameId });
      if (job.type === 'RUN_TESTS' && job.input?.target === 'build') this.emitEvent('BUILD_SUCCEEDED', { jobId: id });
      if (job.type === 'RUN_TESTS' && job.input?.target === 'test') this.emitEvent('TEST_SUCCEEDED', { jobId: id });
      if (job.type === 'FIX_BUG') this.emitEvent('FIX_SUCCEEDED', { jobId: id });
      if (job.type === 'DEPLOY_PREVIEW' || job.type === 'DEPLOY_PRODUCTION') {
        this.emitEvent('DEPLOYMENT_SUCCEEDED', { jobId: id });
      }
    }
    
    // GitHub CI Triggers
    if (newState === 'READY' && job.type === 'DEPLOY_PREVIEW') {
      this.github.triggerGitHubAction('preview-build.yml', 'main').catch(e => console.error(e));
    }
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

    // Trigger failure events for Activepieces
    if (job.type === 'RUN_TESTS' && job.input?.target === 'build') this.emitEvent('BUILD_FAILED', { jobId: id, error });
    if (job.type === 'RUN_TESTS' && job.input?.target === 'test') this.emitEvent('TEST_FAILED', { jobId: id, error });
    if (job.type === 'FIX_BUG') this.emitEvent('FIX_FAILED', { jobId: id, error });
    if (job.type === 'DEPLOY_PREVIEW' || job.type === 'DEPLOY_PRODUCTION') this.emitEvent('DEPLOYMENT_FAILED', { jobId: id, error });
  }

  // Future integration point for Activepieces or Event Bus
  public async executeJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    
    try {
      this.updateJobState(id, 'PLANNING');
      
      // If we are creating a game or fixing bugs, AI needs an isolated branch (Milestone 11)
      if (job.type === 'CREATE_GAME' || job.type === 'FIX_BUG') {
        const safeBranch = `factory-auto/${job.gameId || 'core'}-${job.id.slice(0,6)}`;
        try {
          await this.github.createIsolatedBranch(safeBranch);
          this.log(id, 'info', `Created isolated branch: ${safeBranch}`);
        } catch (e) {
          this.log(id, 'warn', 'Failed to create branch (might be disconnected from git)');
        }
      }

      if (job.type === 'CREATE_GAME') {
        // Milestone 3: SDK Generation
        this.updateJobState(id, 'IMPLEMENTING');
        const sdk = new GameSDK();
        const wrapper = sdk.generateSDKWrapper(job.gameId || 'new-game');
        this.log(id, 'info', 'Game SDK Wrapper generated.');

        // Milestone 7: Asset Pipeline
        this.updateJobState(id, 'OPTIMIZING');
        const pipeline = new AssetPipeline();
        await pipeline.processAssets(job.gameId || 'new-game', '/assets');

        // Milestone 2: Game Registry
        const registry = new RegistryManager();
        registry.registerGame({
          id: job.gameId || 'new-game',
          name: 'Auto Generated Game',
          version: '1.0.0',
          status: 'development',
          assets: ['/assets/bundle.js']
        });
        this.log(id, 'info', 'Game registered in factory manifest.');

        this.updateJobState(id, 'COMPLETED');
      }

      if (job.type === 'RUN_PERFORMANCE_TEST') {
        // Milestone 10: Performance Engine
        this.updateJobState(id, 'TESTING');
        const perf = new PerformanceEngine();
        const results = await perf.runBenchmark(job.gameId || 'target-game');
        this.log(id, 'info', `Performance Benchmark: ${JSON.stringify(results)}`);
        
        if (results.passed) {
          this.updateJobState(id, 'COMPLETED');
        } else {
          this.failJob(id, new Error('Failed performance benchmark'));
        }
      }

      if (job.type === 'FIX_BUG') {
         // Milestone 9: AI Debugger
         this.updateJobState(id, 'FIXING');
         const debuggerAI = new AIDebugger();
         const patch = await debuggerAI.diagnoseFailure(job.gameId || 'target-game', job.input?.error || 'Unknown Error');
         this.log(id, 'info', `AI Debugger proposed patch: ${patch}`);
         this.updateJobState(id, 'COMPLETED');
      }

    } catch (error) {
      this.failJob(id, error);
    }
  }
}
