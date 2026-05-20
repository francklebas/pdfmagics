import { defineStore } from 'pinia';

export const usePdfStore = defineStore('pdf', {
  state: () => ({
    sessionId: 'session-123', // In real app, generate this
    files: [] as any[],
    isUploading: false,
  }),
  actions: {
    setFiles(files: any[]) {
      this.files = files;
    },
    moveFile(index: number, direction: 'up' | 'down') {
      const newFiles = [...this.files];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFiles.length) return;
      
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      this.files = newFiles;
    },
    addFile(file: any) {
      this.files.push(file);
    }
  },
});
