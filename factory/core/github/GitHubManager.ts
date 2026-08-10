import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitHubManager {
  private repoOwner: string;
  private repoName: string;
  private token: string;

  constructor() {
    // Parse owner/repo from GITHUB_REPOSITORY (e.g., "Arnav1135/aquaspin-rewards")
    const fullRepo = process.env.GITHUB_REPOSITORY || 'Arnav1135/aquaspin-rewards';
    const [owner, name] = fullRepo.split('/');
    this.repoOwner = owner;
    this.repoName = name || 'aquaspin-rewards';
    this.token = process.env.GITHUB_TOKEN || '';
  }

  /**
   * Executes a git command in the current workspace.
   */
  private async runGitCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${command}`);
      return stdout.trim();
    } catch (error: any) {
      console.error(`[GitHubManager] Git command failed: git ${command}`);
      throw error;
    }
  }

  /**
   * Creates an isolated branch for the AI to work on.
   */
  public async createIsolatedBranch(branchName: string): Promise<void> {
    console.log(`[GitHubManager] Creating branch: ${branchName}`);
    await this.runGitCommand(`checkout -b ${branchName}`);
  }

  /**
   * Commits the changes made by the AI.
   */
  public async commitChanges(message: string): Promise<void> {
    console.log(`[GitHubManager] Committing changes: "${message}"`);
    await this.runGitCommand(`add .`);
    await this.runGitCommand(`commit -m "${message}"`);
  }

  /**
   * Pushes the current branch to GitHub.
   */
  public async pushBranch(branchName: string): Promise<void> {
    console.log(`[GitHubManager] Pushing branch: ${branchName}`);
    if (!this.token) {
      console.warn(`[GitHubManager] No GITHUB_TOKEN set. Using default credentials for push.`);
    }
    await this.runGitCommand(`push origin ${branchName}`);
  }

  /**
   * Triggers a GitHub Actions workflow (e.g. for preview deployment or tests)
   */
  public async triggerGitHubAction(workflowId: string, ref: string, inputs: any = {}): Promise<void> {
    if (!this.token) {
      console.warn('[GitHubManager] Cannot trigger GitHub Action without GITHUB_TOKEN');
      return;
    }

    console.log(`[GitHubManager] Triggering workflow ${workflowId} on ref ${ref}`);
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/actions/workflows/${workflowId}/dispatches`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref,
          inputs
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger action: ${response.statusText}`);
      }
      console.log(`[GitHubManager] Workflow triggered successfully.`);
    } catch (err) {
      console.error('[GitHubManager] Error triggering GitHub Action:', err);
    }
  }
}
