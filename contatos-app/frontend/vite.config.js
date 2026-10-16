import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy same-origin: o navegador só fala com localhost:5173, então o cookie de sessão
// (HttpOnly, SameSite=Lax) e o CSRF funcionam sem CORS e sem token em localStorage.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000' },
      '/sanctum': { target: 'http://127.0.0.1:8000' },
    },
  },
});
