export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],
  css: [],
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001'
    }
  }
})
