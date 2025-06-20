import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import copyPlugin from 'rollup-plugin-copy'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) // 已经于最近的Vite版本进行支持
  },
  plugins: [
    vue(),
    {
      ...copyPlugin({
        targets: [
          { src: 'public/manifest.json', dest: 'dist' }
        ],
        hook: 'writeBundle'
      })
    }
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
