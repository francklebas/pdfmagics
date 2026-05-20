import { PDFDocument } from 'pdf-lib';
import { IStorageService } from './storage.service.js';
import { FileInfo } from '../types/index.js';

export class PdfService {
  constructor(private storageService: IStorageService) {}

  async generatePdf(fileIds: string[]): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    
    for (const id of fileIds) {
      const buffer = await this.storageService.getFile(id);
      
      // Better mime-type detection for prototype
      const isPdf = buffer.subarray(0, 4).toString() === '%PDF';
      
      if (isPdf) {
        const externalDoc = await PDFDocument.load(buffer);
        const pages = await pdfDoc.copyPages(externalDoc, externalDoc.getPageIndices());
        pages.forEach(page => pdfDoc.addPage(page));
      } else {
        const imagePage = pdfDoc.addPage();
        const { width, height } = imagePage.getSize();
        
        let image;
        try {
          image = await pdfDoc.embedJpg(buffer);
        } catch {
          image = await pdfDoc.embedPng(buffer);
        }

        const imageDims = image.scaleToFit(width, height);
        imagePage.drawImage(image, {
          x: (width - imageDims.width) / 2,
          y: (height - imageDims.height) / 2,
          width: imageDims.width,
          height: imageDims.height,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
