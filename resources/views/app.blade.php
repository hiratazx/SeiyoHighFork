<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
        
        <!-- PWA - Game-specific manifest -->
        @php
            $manifestMap = [
                'game/seiyo-high' => '/manifest-seiyo-high.json',
                // Add new games here:
                // 'game/other-game' => '/manifest-other-game.json',
            ];
            $currentPath = request()->path();
            $manifestUrl = $manifestMap[$currentPath] ?? null;
        @endphp
        @if($manifestUrl)
        <link rel="manifest" href="{{ $manifestUrl }}">
        @endif
        <meta name="theme-color" content="#1a1a2e">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        <!-- Game Fonts & Landing Page Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Noto+Sans+JP&family=Noto+Sans+SC&family=Noto+Sans:wght@400;500;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased dark">
        @inertia
        
        <!-- PWA Service Worker Registration -->
        <script>
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                        .then((registration) => {
                            console.log('PWA: Service Worker registered', registration.scope);
                        })
                        .catch((error) => {
                            console.log('PWA: Service Worker registration failed', error);
                        });
                });
            }
        </script>
    </body>
</html>
