import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers'; // Wait, this is for workers
import { serveStatic as serveStaticNode } from '@hono/node-server/serve-static';
import { LocalStorageService } from './services/storage.service.js';
import { LocalOrderService } from './services/order.service.js';
import { PdfService } from './services/pdf.service.ts'; 
import { serve } from '@hono/node-server';
import path from 'node:path';

const app = new Hono();

app.use('*', cors());

const storage = new LocalStorageService();
const order = new LocalOrderService();
const pdf = new PdfService(storage);

// Routes
app.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  const sessionId = c.req.query('sessionId') || 'default';
  
  if (!file) return c.json({ error: 'No file uploaded' }, 400);
  
  const fileInfo = await storage.saveFile(file);
  await order.addFile(sessionId, fileInfo.id);
  
  return c.json(fileInfo);
});

app.get('/files', async (c) => {
  const sessionId = c.req.query('sessionId') || 'default';
  const state = await order.getOrder(sessionId);
  
  // In a real S3/KV scenario, we'd fetch metadata for these IDs
  // For the prototype, we'll just return the IDs. The frontend can track names if session persists.
  // Better: retrieve file metadata from the storage or a small DB.
  // To keep it KISS, we'll just send the IDs, and we can implement a lookup if needed.
  return c.json(state);
});

app.put('/order', async (c) => {
  const { sessionId, fileIds } = await c.req.json();
  await order.updateOrder(sessionId, fileIds);
  return c.json({ success: true });
});

app.get('/generate', async (c) => {
  const sessionId = c.req.query('sessionId') || 'default';
  const state = await order.getOrder(sessionId);
  
  const pdfBuffer = await pdf.generatePdf(state.fileIds);
  
  return c.body(pdfBuffer, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="result.pdf"',
  });
});

// Serve uploads for preview
app.use('/uploads/*', serveStaticNode({ root: path.join(process.cwd(), 'uploads') }));

serve({
  fetch: app.fetch,
  port: 3001,
});
console.log('Backend running on http://localhost:3001');
