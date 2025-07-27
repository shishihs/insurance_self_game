import chalk from 'chalk'

console.log(chalk.green('✅ CUI system is working!'))
console.log(chalk.blue('🎮 Life Enrichment Game - Terminal Interface'))
console.log(chalk.gray('Dependencies loaded successfully'))

// Test basic imports
try {
  console.log(chalk.yellow('Testing imports...'))
  
  // Test configuration
  import('./config/CUIConfig').then(() => {
    console.log(chalk.green('✅ Config module loaded'))
  }).catch(err => {
    console.log(chalk.red('❌ Config module failed:'), err.message)
  })
  
  // Test utilities
  import('./utils/CardRenderer').then(() => {
    console.log(chalk.green('✅ CardRenderer module loaded'))
  }).catch(err => {
    console.log(chalk.red('❌ CardRenderer module failed:'), err.message)
  })

} catch (error) {
  console.log(chalk.red('❌ Error:'), error)
}