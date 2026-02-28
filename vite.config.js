import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                devOptions: {
                    enabled: false
                },
                manifest: {
                    name: '덜지니어스 보드게임 대여소',
                    short_name: '보드게임 대여',
                    description: '더지니어스 보드게임 동아리 대여 시스템',
                    theme_color: '#ffffff',
                    background_color: '#ffffff',
                    display: 'standalone',
                    icons: [
                        {
                            src: 'favicon.ico',
                            sizes: '64x64 32x32 24x24 16x16',
                            type: 'image/x-icon'
                        },
                        {
                            src: 'logo192.png',
                            type: 'image/png',
                            sizes: '192x192'
                        },
                        {
                            src: 'logo512.png',
                            type: 'image/png',
                            sizes: '512x512'
                        }
                    ]
                }
            })
        ],
        envPrefix: ['VITE_'],
        server: {
            port: 3000,
            proxy: {
                '/v1': {
                    target: 'https://openapi.naver.com',
                    changeOrigin: true,
                    // v1 is kept in path, so no rewrite needed typically if target is openapi.naver.com
                    // But original proxy had target 'https://openapi.naver.com/v1', so we need to be careful.
                    // Original: target: 'https://openapi.naver.com/v1', path: '/v1' -> result: 'https://openapi.naver.com/v1/v1...' if not handled?
                    // Express proxy default behavior: /v1/search -> https://target/v1/search
                    // Let's match typical Vite behavior.
                    rewrite: (path) => path.replace(/^\/v1/, '/v1'), // maintain /v1
                    configure: (proxy, _options) => {
                        proxy.on('proxyReq', (proxyReq, req, _res) => {
                            const clientId = env.VITE_NAVER_CLIENT_ID
                            const clientSecret = env.VITE_NAVER_CLIENT_SECRET
                            if (clientId && clientSecret) {
                                proxyReq.setHeader('X-Naver-Client-Id', clientId)
                                proxyReq.setHeader('X-Naver-Client-Secret', clientSecret)
                                // console.log(`[Proxy] API Key injected for ${req.url}`)
                            }
                        })
                    },
                },
            },
        },
        build: {
            outDir: 'build',
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom', 'react-router-dom'],
                        supabase: ['@supabase/supabase-js']
                    }
                }
            }
        },
    }
})
