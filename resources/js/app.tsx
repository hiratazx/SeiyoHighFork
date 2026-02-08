import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

// Local implementation of resolvePageComponent (replaces laravel-vite-plugin/inertia-helpers)
function resolvePageComponent<T>(
    path: string,
    pages: Record<string, () => Promise<T>>
): Promise<T> {
    const page = pages[path];
    if (!page) {
        throw new Error(`Page not found: ${path}`);
    }
    return page();
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title: string) => `${title} - ${appName}`,
    resolve: (name: string) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx') as Record<string, () => Promise<any>>,
        ),
    setup({ el, App, props }: { el: HTMLElement; App: any; props: any }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
