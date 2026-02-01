import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    safelist: [
        'text-cyan-300',
        'text-pink-300',
        'text-purple-300',
        'text-yellow-400',
        'text-gray-200',
        'text-green-300',
        'text-violet-400',
        'text-green-200',
        'text-slate-300',
        'text-amber-400',
        'text-orange-300',
        'text-gray-400',
        'text-purple-400',
        'text-red-400',
        'text-teal-300',
        'text-rose-400',
        'text-indigo-400',
        'text-sky-300',
        'text-orange-400',
        'text-stone-400',
    ],

    darkMode: 'class',

    theme: {
        extend: {
            colors: {
                'primary': '#f49d25',
                'background-light': '#f8f7f5',
                'background-dark': '#221a10',
                'indigo-sunset': '#1a1a2e',
                'amber-glow': 'rgba(244, 157, 37, 0.2)',
            },
            fontFamily: {
                sans: ['Noto Sans', 'Figtree', ...defaultTheme.fontFamily.sans],
                display: ['Noto Serif', 'serif'],
            },
        },
    },

    plugins: [forms],
};
