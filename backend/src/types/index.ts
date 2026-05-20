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

export const VALID_SESSION_ID_REGEX = /^[0-9a-f-]{36}$/;
