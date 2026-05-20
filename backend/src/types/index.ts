export interface FileInfo {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  size: number;
  url: string;
}

export interface SessionState {
  fileIds: string[];
}
