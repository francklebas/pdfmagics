import { expect, test, describe, beforeEach, afterAll } from 'bun:test';
import { PdfService } from '../src/services/pdf.service.js';
import { LocalStorageService } from '../src/services/storage.service.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

describe('PdfService', () => {
  let storage: LocalStorageService;
  let pdfService: PdfService;
  const testDir = path.join(process.cwd(), 'tests/temp_uploads');

  beforeEach(async () => {
    if (!require('fs').existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    storage = new LocalStorageService();
    (storage as any).uploadDir = testDir;
    pdfService = new PdfService(storage);
  });

  test('should generate an empty PDF when no files are provided', async () => {
    const buffer = await pdfService.generatePdf([]);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  test('should handle corrupted or unsupported buffers gracefully', async () => {
    const id = 'test-corrupt';
    writeFileSync(path.join(testDir, `${id}.bin`), Buffer.from('not a pdf or image'));
    
    const buffer = await pdfService.generatePdf([id]);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
});
