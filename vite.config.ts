import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';

// `/wall` を wall.html に割り当てる(投稿画面 = `/`、表示画面 = `/wall`)
function wallRewrite(): Plugin {
  const rewrite = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    if (url === '/wall' || url === '/wall/' || url.startsWith('/wall?')) {
      return '/wall.html' + (url.includes('?') ? url.slice(url.indexOf('?')) : '');
    }
    return undefined;
  };
  return {
    name: 'tanzaku-wall-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const to = rewrite(req.url);
        if (to) req.url = to;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const to = rewrite(req.url);
        if (to) req.url = to;
        next();
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [wallRewrite()],
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        wall: fileURLToPath(new URL('./wall.html', import.meta.url)),
      },
    },
  },
});
