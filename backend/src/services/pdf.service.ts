import { PDFDocument } from 'pdf-lib';
import { IStorageService } from './storage.service.js';

export class PdfService {
  constructor(private storageService: IStorageService) {}

  async generatePdf(fileIds: string[]): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    
    for (const id of fileIds) {
      const buffer = await this.storageService.getFile(id);
      
      const isPdf = this.isPdf(buffer);
      const isJpeg = this.isJpeg(buffer);
      const isPng = this.isPng(buffer);

      if (isPdf) {
        try {
          const externalDoc = await PDFDocument.load(buffer);
          const pages = await pdfDoc.copyPages(externalDoc, externalDoc.getPageIndices());
          pages.forEach(page => pdfDoc.addPage(page));
        } catch (e) {
          console.error(`Failed to load PDF ${id}:`, e);
        }
      } else if (isJpeg || isPng) {
        try {
          const imagePage = pdfDoc.addPage();
          const { width, height } = imagePage.getSize();
          
          const image = isJpeg 
            ? await pdfDoc.embedJpg(buffer) 
            : await pdfDoc.embedPng(buffer);
          
          const imageDims = image.scaleToFit(width, height);
          imagePage.drawImage(image, {
            x: (width - imageDims.width) / 2,
            y: (height - imageDims.height) / 2,
            width: imageDims.width,
            height: imageDims.height,
          });
        } catch (e) {
          console.error(`Failed to embed image ${id}:`, e);
        }
      } else {
        console.error(`Unsupported file format for ID ${id}`);
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private isPdf(buffer: Buffer): boolean {
    return buffer.subarray(0, 4).toString() === '%PDF';
  }

  private isJpeg(buffer: Buffer): boolean {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  private isPng(buffer: Buffer): boolean {
    return buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  }
}
