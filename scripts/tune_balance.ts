import { execSync } from 'child_process'
import { join } from 'path'

const args = process.argv.slice(2)
const cliPath = join(__dirname, '../src/cui/difficulty-cli.ts')

try {
    execSync(`npx vite-node ${cliPath} simulate ${args.join(' ')}`, { stdio: 'inherit' })
} catch (error) {
    process.exit(1)
}
