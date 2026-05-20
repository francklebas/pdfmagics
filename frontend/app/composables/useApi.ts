export const useApi = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase || 'http://localhost:3001';

  async function uploadFile(file: File, sessionId: string) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${baseUrl}/upload?sessionId=${sessionId}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  }

  async function getFiles(sessionId: string) {
    const res = await fetch(`${baseUrl}/files?sessionId=${sessionId}`);
    if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
    return res.json();
  }

  async function updateOrder(sessionId: string, fileIds: string[]) {
    const res = await fetch(`${baseUrl}/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fileIds }),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.statusText}`);
    return res.json();
  }

  function generatePdf(sessionId: string) {
    return `${baseUrl}/generate?sessionId=${sessionId}`;
  }

  return { uploadFile, getFiles, updateOrder, generatePdf };
};
