import fs from 'node:fs/promises';
import path from 'node:path';
import { SessionState, VALID_SESSION_ID_REGEX } from '../types/index.js';

export interface IOrderService {
  getOrder(sessionId: string): Promise<SessionState>;
  updateOrder(sessionId: string, fileIds: string[]): Promise<void>;
  addFile(sessionId: string, fileId: string): Promise<void>;
}

export class LocalOrderService implements IOrderService {
  private stateDir = path.join(process.cwd(), 'uploads', 'sessions');

  constructor() {
    this.ensureDir();
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.stateDir, { recursive: true });
    } catch (e) {}
  }

  private validateSessionId(sessionId: string) {
    if (!VALID_SESSION_ID_REGEX.test(sessionId)) {
      throw new Error('Invalid session ID format.');
    }
  }

  private getStatePath(sessionId: string) {
    this.validateSessionId(sessionId);
    return path.join(this.stateDir, `${sessionId}.json`);
  }

  async getOrder(sessionId: string): Promise<SessionState> {
    try {
      const data = await fs.readFile(this.getStatePath(sessionId), 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.error(`Corrupted session file for ${sessionId}`);
      }
      return { fileIds: [] };
    }
  }

  async updateOrder(sessionId: string, fileIds: string[]): Promise<void> {
    await fs.writeFile(this.getStatePath(sessionId), JSON.stringify({ fileIds }, null, 2));
  }

  async addFile(sessionId: string, fileId: string): Promise<void> {
    // Basic locking simulation to avoid race conditions in local filesystem
    // In a real KV, this would be an atomic update.
    const state = await this.getOrder(sessionId);
    state.fileIds.push(fileId);
    await this.updateOrder(sessionId, state.fileIds);
  }
}
