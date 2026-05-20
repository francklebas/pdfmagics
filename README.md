# 🪄 PDF Magics

An intelligent PDF composer that allows users to upload images and documents, define their order, and generate a final merged PDF.

## 🚀 Tech Stack

### Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **PDF Engine**: `pdf-lib`
- **Storage**: Local simulation (designed for Cloudflare R2 / MinIO)
- **State**: Local simulation (designed for Cloudflare KV)

### Frontend
- **Framework**: [Nuxt 4](https://nuxt.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **UI Components**: Reka UI / Radix Vue

## 🛠️ Local Installation & Setup

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine.

### Backend Setup
```bash
cd backend
bun install
bun run src/index.ts
```
The API will be available at `http://localhost:3001`.

### Frontend Setup
```bash
cd frontend
bun install
bun run dev
```
The application will be available at `http://localhost:3000`.

## 🏗️ Architecture Principles

This project follows **SOLID** and **KISS** principles:
- **Single Responsibility**: Separation between storage, order management, and PDF generation.
- **Interface Segregation**: Services are defined by interfaces to allow easy switching between local storage $\rightarrow$ Cloudflare R2 and local state $\rightarrow$ Cloudflare KV.
- **Simplicity**: Minimal overhead for rapid MVP iteration.

## 🗺️ Road to Production (Cloudflare)
To deploy this to Cloudflare:
1. Swap `LocalStorageService` with Cloudflare R2 bindings.
2. Swap `LocalOrderService` with Cloudflare KV bindings.
3. Change the Hono entry point to use the `cloudflare-workers` runtime.
