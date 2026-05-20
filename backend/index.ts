import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic as serveStaticNode } from '@hono/node-server/serve-static';
import path from 'node:path';
import { LocalStorageService } from './src/services/storage.service.js';
import { LocalOrderService } from './src/services/order.service.js';
import { PdfService } from './src/services/pdf.service.js';
import { VALID_SESSION_ID_REGEX } from './src/types/index.js';

const app = new Hono();

app.use('*', cors({
  origin: 'http://localhost:3000',
}));

const storage = new LocalStorageService();
const order = new LocalOrderService();
const pdf = new PdfService(storage);

const sessionMiddleware = async (c: any, next: any) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId || !VALID_SESSION_ID_REGEX.test(sessionId)) {
    return c.json({ error: 'Valid sessionId query parameter is required' }, 400);
  }
  await next();
};

app.post('/upload', sessionMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  const sessionId = c.req.query('sessionId')!;
  
  if (!file) return c.json({ error: 'No file uploaded' }, 400);
  
  try {
    const fileInfo = await storage.saveFile(file);
    await order.addFile(sessionId, fileInfo.id);
    return c.json(fileInfo);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.get('/files', sessionMiddleware, async (c) => {
  const sessionId = c.req.query('sessionId')!;
  const state = await order.getOrder(sessionId);
  return c.json(state);
});

app.put('/order', async (c) => {
  const { sessionId, fileIds } = await c.req.json();
  if (!sessionId || !VALID_SESSION_ID_REGEX.test(sessionId)) {
    return c.json({ error: 'Invalid sessionId' }, 400);
  }
  if (!Array.isArray(fileIds) || !fileIds.every(id => typeof id === 'string' && VALID_SESSION_ID_REGEX.test(id))) {
    return c.json({ error: 'Invalid fileIds. Must be an array of UUIDs.' }, 400);
  }
  await order.updateOrder(sessionId, fileIds);
  return c.json({ success: true });
});

app.get('/generate', sessionMiddleware, async (c) => {
  const sessionId = c.req.query('sessionId')!;
  const state = await order.getOrder(sessionId);
  try {
    const pdfBuffer = await pdf.generatePdf(state.fileIds);
    // FIX: Correct c.body signature (data, status, headers)
    return c.body(pdfBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="result.pdf"',
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// FIX: root set to process.cwd() so that '/uploads/files/...' resolves correctly
app.use('/uploads/files/*', serveStaticNode({ 
  root: process.cwd() 
}));

serve({
  fetch: app.fetch,
  port: 3001,
});
console.log('Backend running on http://localhost:3001');
