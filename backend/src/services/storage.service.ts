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
  private uploadDir = path.join(process.cwd(), 'uploads', 'files');
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  constructor() {
    this.ensureDir();
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create uploads directory', e);
    }
  }

  private detectType(buf: Buffer): 'image' | 'pdf' | null {
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image'; // JPEG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image'; // PNG
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image'; // GIF
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image'; // WebP
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf'; // %PDF
    return null;
  }

  async saveFile(file: File): Promise<FileInfo> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File too large. Max size is 10MB.');
    }

    const id = randomUUID();
    const extension = path.extname(file.name) || '.bin';
    const filename = `${id}${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());

    const detectedType = this.detectType(buffer);
    if (!detectedType) throw new Error('Unsupported file type.');
    await fs.writeFile(filePath, buffer);

    // We store the absolute path or a predictable relative path for O(1) access
    return {
      id,
      name: file.name,
      type: detectedType,
      size: file.size,
      url: `/uploads/files/${filename}`,
    };
  }

  async getFile(id: string): Promise<Buffer> {
    // To achieve O(1) without a DB, we store the filename mapping in the session 
    // but for this MVP, we'll search once and cache it or use a mapping.
    // Since the ID is a UUID and we use it as the filename prefix, we can use a simple trick:
    const files = await fs.readdir(this.uploadDir);
    const file = files.find(f => f.startsWith(id));
    if (!file) throw new Error(`File ${id} not found`);
    
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
