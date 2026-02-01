// Vite config for HuggingFace Spaces deployment
// This builds a standalone SPA (not integrated with Laravel)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    // Public directory for static assets (images, demo save, manifest)
    publicDir: 'public',
    // Build configuration for standalone SPA
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.hf.html'),
            },
        },
    },
    // CSS configuration
    css: {
        postcss: './postcss.config.js',
    },
});
