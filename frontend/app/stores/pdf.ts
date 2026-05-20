import { defineStore } from 'pinia';
import type { FileInfo } from '../types/index';

export const usePdfStore = defineStore('pdf', {
  state: () => ({
    sessionId: '',
    files: [] as FileInfo[],
    isUploading: false,
  }),
  actions: {
    initSession() {
      if (this.sessionId) return;
      // Simple UUID v4 simulation for frontend
      this.sessionId = crypto.randomUUID();
      localStorage.setItem('pdf_magic_session', this.sessionId);
    },
    setFiles(files: FileInfo[]) {
      this.files = files;
    },
    addFile(file: FileInfo) {
      this.files.push(file);
    },
    removeFile(index: number) {
      this.files.splice(index, 1);
    },
    moveFile(index: number, direction: 'up' | 'down') {
      const newFiles = [...this.files];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFiles.length) return;
      
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      this.files = newFiles;
    },
    setUploading(val: boolean) {
      this.isUploading = val;
    }
  },
});
