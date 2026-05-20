import { expect, test, describe } from 'bun:test';
import { LocalOrderService } from '../src/services/order.service.js';
import { LocalStorageService } from '../src/services/storage.service.js';
import { randomUUID } from 'node:crypto';

describe('Integration: Upload & Order Flow', () => {
  const storage = new LocalStorageService();
  const order = new LocalOrderService();
  const testSession = randomUUID();

  test('should correctly sequence multiple uploads', async () => {
    // Use real Magic Bytes for PDF and PNG
    const pdfContent = Buffer.from('%PDF-1.4\n%...dummy content...');
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

  test('should update order correctly', async () => {
    const state = await order.getOrder(testSession);
    const reversedIds = [...state.fileIds].reverse();
    
    await order.updateOrder(testSession, reversedIds);
    const newState = await order.getOrder(testSession);
    
    expect(newState.fileIds).toEqual(reversedIds);
  });
});
