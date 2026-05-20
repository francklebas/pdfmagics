import fs from 'node:fs/promises';
import path from 'node:path';
import { SessionState } from '../types/index.js';

export interface IOrderService {
  getOrder(sessionId: string): Promise<SessionState>;
  updateOrder(sessionId: string, fileIds: string[]): Promise<void>;
  addFile(sessionId: string, fileId: string): Promise<void>;
}

export class LocalOrderService implements IOrderService {
  private stateDir = path.join(process.cwd(), 'uploads'); // Using same dir for simplicity in MVP

  private getStatePath(sessionId: string) {
    return path.join(this.stateDir, `${sessionId}.json`);
  }

  async getOrder(sessionId: string): Promise<SessionState> {
    try {
      const data = await fs.readFile(this.getStatePath(sessionId), 'utf-8');
      return JSON.parse(data);
    } catch {
      return { fileIds: [] };
    }
  }

  async updateOrder(sessionId: string, fileIds: string[]): Promise<void> {
    await fs.writeFile(this.getStatePath(sessionId), JSON.stringify({ fileIds }));
  }

  async addFile(sessionId: string, fileId: string): Promise<void> {
    const state = await this.getOrder(sessionId);
    state.fileIds.push(fileId);
    await this.updateOrder(sessionId, state.fileIds);
  }
}
