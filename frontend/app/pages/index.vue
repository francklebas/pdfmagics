<template>
  <div class="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
    <div class="max-w-2xl mx-auto">
      <header class="mb-12 text-center">
        <h1 class="text-4xl font-bold tracking-tight text-indigo-600">PDF Magics</h1>
        <p class="text-gray-500 mt-2">Compose your documents effortlessly</p>
      </header>

      <!-- Upload Section -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <div 
          @dragover.prevent 
          @drop.prevent="handleDrop"
          class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-400 transition-colors cursor-pointer"
          @click="triggerFileInput"
        >
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden" 
            multiple 
            @change="handleFileChange" 
          />
          <div class="flex flex-col items-center gap-3">
            <div class="bg-indigo-50 p-3 rounded-full text-indigo-600">
              <UploadIcon class="w-6 h-6" />
            </div>
            <p class="text-sm text-gray-600">
              Drag & drop images or PDFs, or <span class="text-indigo-600 font-medium">browse</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Files List -->
      <div v-if="store.files.length > 0" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Documents ({{ store.files.length }})</h2>
          <button 
            @click="generatePdf"
            class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Generate PDF
          </button>
        </div>

        <div class="grid gap-3">
          <div 
            v-for="(file, index) in store.files" 
            :key="file.id" 
            class="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm"
          >
            <div class="flex items-center gap-4">
              <span class="text-xs font-bold text-gray-400 w-4">{{ index + 1 }}</span>
              <div class="p-2 bg-gray-100 rounded-lg">
                <FileIcon v-if="file.type === 'pdf'" class="w-5 h-5 text-red-500" />
                <ImageIcon v-else class="w-5 h-5 text-blue-500" />
              </div>
              <span class="font-medium text-sm truncate max-w-[200px]">{{ file.name }}</span>
            </div>

            <div class="flex items-center gap-2">
              <button @click="move(index, 'up')" :disabled="index === 0" class="p-1 disabled:opacity-30 hover:bg-gray-100 rounded">
                <ArrowUpIcon class="w-4 h-4" />
              </button>
              <button @click="move(index, 'down')" :disabled="index === store.files.length - 1" class="p-1 disabled:opacity-30 hover:bg-gray-100 rounded">
                <ArrowDownIcon class="w-4 h-4" />
              </button>
              <button @click="removeFile(index)" class="p-1 text-red-400 hover:bg-red-50 rounded">
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="!store.isUploading" class="text-center py-20 text-gray-400">
        No files added yet. Start by uploading some images or PDFs.
      </div>
    </div>
  </div>
</template>

<script setup>
import { UploadIcon, FileIcon, ImageIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from 'lucide-vue-next';
import { usePdfStore } from '~/app/stores/pdf';
import { useApi } from '~/app/composables/useApi';

const store = usePdfStore();
const { uploadFile, updateOrder, generatePdf: getPdfUrl } = useApi();
const fileInput = ref(null);

const triggerFileInput = () => fileInput.value.click();

async function handleFileChange(e) {
  const files = e.target.files;
  if (!files) return;
  
  for (const file of files) {
    const result = await uploadFile(file, store.sessionId);
    store.addFile(result);
  }
}

async function handleDrop(e) {
  const files = e.dataTransfer.files;
  if (!files) return;
  
  Array.from(files).forEach(async (file) => {
    const result = await uploadFile(file, store.sessionId);
    store.addFile(result);
  });
}

async function move(index, direction) {
  store.moveFile(index, direction);
  await updateOrder(store.sessionId, store.files.map(f => f.id));
}

async function removeFile(index) {
  store.files.splice(index, 1);
  await updateOrder(store.sessionId, store.files.map(f => f.id));
}

async function generatePdf() {
  const url = getPdfUrl(store.sessionId);
  window.location.href = url;
}
</script>
