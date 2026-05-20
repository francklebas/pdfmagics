import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('PDF Magics End-to-End', () => {
  const API_URL = 'http://localhost:3001';
  const APP_URL = 'http://localhost:3000';

  test('should upload files, reorder them, and generate a PDF', async ({ page }) => {
    await page.goto(APP_URL);

    // Create dummy files for upload using absolutely correct paths
    const testFilesDir = path.join(process.cwd(), 'tests');
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    const pdfPath = path.join(testFilesDir, 'test.pdf');
    const imgPath = path.join(testFilesDir, 'test.png');
    fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4\ndummy content'));
    fs.writeFileSync(imgPath, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

    // Upload PDF
    await page.setInputFiles('input[type="file"]', pdfPath);
    await expect(page.locator('text=test.pdf')).toBeVisible();

    // Upload Image
    await page.setInputFiles('input[type="file"]', imgPath);
    await expect(page.locator('text=test.png')).toBeVisible();

    // Reorder: move PDF down (if it's first)
    const moveDownButton = page.locator('button').filter({ hasText: '' }).nth(2); 
    await moveDownButton.click();

    // Generate PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Generate PDF');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('result.pdf');
    
    // Cleanup
    fs.unlinkSync(pdfPath);
    fs.unlinkSync(imgPath);
  });
});
