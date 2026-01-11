import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        rollupOptions: {
            external: ['better-sqlite3'],
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/better-sqlite3',
                    dest: 'node_modules'
                },
                {
                    src: 'node_modules/bindings',
                    dest: 'node_modules'
                },
                {
                    src: 'node_modules/file-uri-to-path',
                    dest: 'node_modules'
                }
            ]
        })
    ]
});
