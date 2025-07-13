import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 วินาทีสำหรับแต่ละเทส
    hookTimeout: 60000, // 60 วินาทีสำหรับ setup (beforeAll) และ teardown (afterAll)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})