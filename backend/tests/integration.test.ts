import { expect, test, describe, afterAll, beforeAll } from 'bun:test';
import { LocalOrderService } from '../src/services/order.service.js';
import { LocalStorageService } from '../src/services/storage.service.js';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { rmSync, mkdirSync, existsSync } from 'node:fs';

describe('Integration: Upload & Order Flow', () => {
  const testDir = path.join(process.cwd(), 'tests/temp_integration');
  
  let storage: LocalStorageService;
  let order: LocalOrderService;

  beforeAll(async () => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    storage = new LocalStorageService();
    // Manually force the directory to testDir to be sure
    (storage as any).uploadDir = path.join(testDir, 'files');
    // Force directory creation immediately as the service might not have done it yet
    mkdirSync(path.join(testDir, 'files'), { recursive: true });
    
    order = new LocalOrderService();
    (order as any).stateDir = path.join(testDir, 'sessions');
    mkdirSync(path.join(testDir, 'sessions'), { recursive: true });
  });

  test('should correctly sequence multiple uploads', async () => {
    const testSession = randomUUID();
    
    const pdfContent = Buffer.from('%PDF-1.4\ndummy content');
    const pngContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    const file1 = new File([pdfContent], 'test1.pdf', { type: 'application/pdf' });
    const file2 = new File([pngContent], 'test2.png', { type: 'image/png' });

    const info1 = await storage.saveFile(file1);
    await order.addFile(testSession, info1.id);
    
    const info2 = await storage.saveFile(file2);
    await order.addFile(testSession, info2.id);

    const state = await order.getOrder(testSession);
    expect(state.fileIds).toEqual([info1.id, info2.id]);
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
});
