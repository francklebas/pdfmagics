import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic as serveStaticNode } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import path from 'node:path';
import { LocalStorageService } from './services/storage.service.js';
import { LocalOrderService } from './services/order.service.js';
import { PdfService } from './services/pdf.service.js';
import { VALID_SESSION_ID_REGEX } from './types/index.js';

const app = new Hono();

app.use('*', cors());

const storage = new LocalStorageService();
const order = new LocalOrderService();
const pdf = new PdfService(storage);

// Middleware to validate session ID
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
  
  await order.updateOrder(sessionId, fileIds);
  return c.json({ success: true });
});

app.get('/generate', sessionMiddleware, async (c) => {
  const sessionId = c.req.query('sessionId')!;
  const state = await order.getOrder(sessionId);
  
  try {
    const pdfBuffer = await pdf.generatePdf(state.fileIds);
    return c.body(pdfBuffer, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="result.pdf"',
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Security: Serve only the files dir, not the sessions dir
app.use('/uploads/files/*', serveStaticNode({ 
  root: path.join(process.cwd(), 'uploads') 
}));

serve({
  fetch: app.fetch,
  port: 3001,
});
console.log('Backend running on http://localhost:3001');
