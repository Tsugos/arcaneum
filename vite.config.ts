/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

function feedbackSaverPlugin() {
  return {
    name: 'feedback-saver-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/save-feedback', (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filePath = path.resolve(__dirname, 'user_feedback_notes.md');
              const timestamp = new Date().toLocaleString('ru-RU');
              
              let entry = `\n### Замечание (${timestamp})\n`;
              if (data.category) entry += `- **Категория**: ${data.category}\n`;
              if (data.componentName) entry += `- **Компонент**: \`${data.componentName}\`${data.filePath ? ` (\`${data.filePath}\`)` : ''}\n`;
              entry += `- **Селектор элемента**: \`<${data.selector || 'unknown'}>\`\n`;
              entry += `- **Текст элемента**: ${data.textSnippet || 'Без текста'}\n`;
              entry += `- **Что происходит**: ${data.comment || ''}\n`;
              if (data.expected) entry += `- **Ожидаемый результат**: ${data.expected}\n`;
              if (data.contextInfo) entry += `- **Контекст элемента**: \`${data.contextInfo}\`\n`;
              entry += `\n---\n`;

              if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, `# Замечания и баг-репорты пользователя Arcaneum Inspector\n\n${entry}`, 'utf-8');
              } else {
                fs.appendFileSync(filePath, entry, 'utf-8');
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Сохранено прямо в файл user_feedback_notes.md' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    feedbackSaverPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Arcaneum OS',
        short_name: 'Arcaneum',
        description: 'Autonomous Personal AI Platform & Character Studio',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/chub-search': {
        target: 'https://api.chub.ai',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/chub-search/, '/search'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://chub.ai/',
        },
      },
      '/chub-api': {
        target: 'https://api.chub.ai',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/chub-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://chub.ai',
          'Referer': 'https://chub.ai/',
        },
      },
      '/chub-avatars': {
        target: 'https://avatars.charhub.io',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/chub-avatars/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Referer': 'https://chub.ai/',
        },
      },
      '/google-translate': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/google-translate/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
  },
});
