# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pdfmagics.spec.ts >> PDF Magics End-to-End >> should upload files, reorder them, and generate a PDF
- Location: tests/pdfmagics.spec.ts:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=test.pdf')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=test.pdf')

```

```yaml
- status
- banner:
  - heading "PDF Magics" [level=1]
  - paragraph: Compose your documents effortlessly
- paragraph: Drag & drop images or PDFs, or browse
- text: No files added yet. Start by uploading some images or PDFs.
- img
- button "Toggle Nuxt DevTools":
  - img
- text: 33 ms
- button "Toggle Component Inspector":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'node:fs';
  3  | import path from 'node:path';
  4  | 
  5  | test.describe('PDF Magics End-to-End', () => {
  6  |   const API_URL = 'http://localhost:3001';
  7  |   const APP_URL = 'http://localhost:3000';
  8  | 
  9  |   test('should upload files, reorder them, and generate a PDF', async ({ page }) => {
  10 |     await page.goto(APP_URL);
  11 | 
  12 |     // Create dummy files for upload using absolutely correct paths
  13 |     const testFilesDir = path.join(process.cwd(), 'tests');
  14 |     if (!fs.existsSync(testFilesDir)) {
  15 |       fs.mkdirSync(testFilesDir, { recursive: true });
  16 |     }
  17 |     const pdfPath = path.join(testFilesDir, 'test.pdf');
  18 |     const imgPath = path.join(testFilesDir, 'test.png');
  19 |     fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4\ndummy content'));
  20 |     fs.writeFileSync(imgPath, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  21 | 
  22 |     // Upload PDF
  23 |     await page.setInputFiles('input[type="file"]', pdfPath);
> 24 |     await expect(page.locator('text=test.pdf')).toBeVisible();
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  25 | 
  26 |     // Upload Image
  27 |     await page.setInputFiles('input[type="file"]', imgPath);
  28 |     await expect(page.locator('text=test.png')).toBeVisible();
  29 | 
  30 |     // Reorder: move PDF down (if it's first)
  31 |     const moveDownButton = page.locator('button').filter({ hasText: '' }).nth(2); 
  32 |     await moveDownButton.click();
  33 | 
  34 |     // Generate PDF
  35 |     const downloadPromise = page.waitForEvent('download');
  36 |     await page.click('text=Generate PDF');
  37 |     const download = await downloadPromise;
  38 |     
  39 |     expect(download.suggestedFilename()).toContain('result.pdf');
  40 |     
  41 |     // Cleanup
  42 |     fs.unlinkSync(pdfPath);
  43 |     fs.unlinkSync(imgPath);
  44 |   });
  45 | });
  46 | 
```