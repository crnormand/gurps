import { spawn } from 'node:child_process'

const processes = []

const run = (command, args) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  processes.push(child)
  child.on('exit', code => {
    if (code && code !== 0) process.exit(code)
  })
  return child
}

run('npm', ['run', 'watch:code'])
run('npm', ['run', 'watch:styles'])
run('npm', ['run', 'watch:static'])

const shutdown = () => {
  for (const p of processes) p.kill('SIGTERM')
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
