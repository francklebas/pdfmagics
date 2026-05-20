import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileInfo } from '../types/index.js';

export interface IStorageService {
  saveFile(file: File): Promise<FileInfo>;
  getFile(id: string): Promise<Buffer>;
  deleteFile(id: string): Promise<void>;
}

export class LocalStorageService implements IStorageService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure directory exists, but let's do it in the index or a boot step
  }

  async saveFile(file: File): Promise<FileInfo> {
    const id = randomUUID();
    const extension = path.extname(file.name);
    const filename = `${id}${extension}`;
    const filePath = path.join(this.uploadDir, filename);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return {
      id,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'pdf',
      size: file.size,
      url: `/uploads/${filename}`,
    };
  }

  async getFile(id: string): Promise<Buffer> {
    const files = await fs.readdir(this.uploadDir);
    const file = files.find(f => f.startsWith(id));
    if (!file) throw new Error('File not found');
    return fs.readFile(path.join(this.uploadDir, file));
  }

  async deleteFile(id: string): Promise<void> {
    const files = await fs.readdir(this.uploadDir);
    const file = files.find(f => f.startsWith(id));
    if (file) {
      await fs.unlink(path.join(this.uploadDir, file));
    }
  }
}
