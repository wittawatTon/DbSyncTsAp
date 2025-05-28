// build-exe.js
import { compile } from 'nexe';

compile({
  input: 'dist/src/server.js',
  build: true, // ต้องใช้ true เพื่อรองรับ ESM เต็มรูปแบบ
  output: 'dist/backend.exe',
  target: 'windows-x64-20.11.1', // หรือ Node เวอร์ชันที่รองรับ ESM ของคุณ
  resources: [
    'dist/config/*.json',
    '.env'
  ],
}).then(() => {
  console.log('✅ EXE build success');
}).catch((err) => {
  console.error('❌ Build failed:', err);
});
