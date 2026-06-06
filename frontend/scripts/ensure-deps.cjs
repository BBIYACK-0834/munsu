const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const viteBin = join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')

if (existsSync(viteBin)) {
  process.exit(0)
}

console.log('프론트엔드 의존성이 없어 npm install을 자동 실행합니다.')

const result = spawnSync('npm', ['install'], {
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
