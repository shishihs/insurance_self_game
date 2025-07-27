# CUI (Character User Interface) Usage Guide

## 🎮 Overview

The CUI system provides a beautiful, feature-rich terminal-based interface for playing the Life Enrichment Game. It offers multiple modes, themes, and interaction styles to suit different needs.

## 🚀 Quick Start

```bash
# Interactive gameplay
pnpm cui:play

# Watch AI demonstration
pnpm cui:demo

# Learn with guided tutorial
pnpm cui:tutorial

# Performance testing
pnpm cui:benchmark

# Developer debugging
pnpm cui:debug
```

## 📋 Available Commands

### Interactive Play
```bash
# Basic gameplay
pnpm cui:play

# With custom theme
pnpm cui:play --theme dark

# Compact layout for smaller terminals
pnpm cui:play --compact

# No animations (faster)
pnpm cui:play --no-animations

# Custom difficulty
pnpm cui:play --difficulty hard --vitality 15
```

### Demo Mode
```bash
# Standard AI demo
pnpm cui:demo

# Fast-paced demo
pnpm cui:demo:fast

# Aggressive AI strategy
pnpm cui:demo:aggressive

# Multiple games
pnpm cui:demo --games 5

# Different strategies
pnpm cui:demo --strategy conservative
```

### Benchmark Mode
```bash
# Standard benchmark (100 games)
pnpm cui:benchmark

# Quick benchmark (50 games)
pnpm cui:benchmark:quick

# Custom game count
pnpm cui:benchmark --games 1000

# Export results
pnpm cui:benchmark --output results.json
```

### Tutorial Mode
```bash
# Full tutorial
pnpm cui:tutorial

# Skip introduction
pnpm cui:tutorial --skip-intro

# Different theme
pnpm cui:tutorial --theme colorful
```

### Debug Mode
```bash
# Start debug session
pnpm cui:debug

# With specific theme
pnpm cui:debug --theme minimal
```

### Help
```bash
# Show advanced usage
pnpm cui:help

# Show basic help
pnpm cui --help
```

## 🎨 Themes

### Available Themes
- **default**: Professional blue/gray theme
- **dark**: Dark mode for low-light environments
- **colorful**: Vibrant, fun colors
- **minimal**: Black and white only
- **matrix**: Green terminal aesthetic

### Usage
```bash
pnpm cui:play --theme matrix
pnpm cui:demo --theme colorful
pnpm cui:tutorial --theme dark
```

## ⚡ Animation Speeds

- **slow**: Deliberate pace for presentations
- **normal**: Default comfortable speed
- **fast**: Quick animations
- **off**: No animations (fastest performance)

### Usage
```bash
pnpm cui:play --speed slow
pnpm cui:demo --speed turbo
```

## 🎯 Game Difficulties

- **easy**: 25 vitality, 6 starting cards
- **normal**: 20 vitality, 5 starting cards
- **hard**: 15 vitality, 4 starting cards

### Usage
```bash
pnpm cui:play --difficulty easy
pnpm cui:play --difficulty hard --vitality 10
```

## 🔧 Advanced Features

### Card Display Styles
- **detailed**: Full card information with descriptions
- **compact**: Condensed view for grid layouts
- **ascii**: ASCII art borders
- **unicode**: Unicode characters and emojis

### Accessibility Options
```bash
# For color-blind users
pnpm cui:play --no-colors

# For motion sensitivity
pnpm cui:play --no-animations

# For smaller terminals
pnpm cui:play --compact
```

### Demo Strategies
- **smart**: Balanced decision-making (default)
- **aggressive**: High-risk, high-reward plays
- **conservative**: Safe, cautious gameplay

## 📊 Benchmark Results

Benchmark mode provides detailed statistics:
- **Performance metrics**: Games per second, memory usage
- **Game outcomes**: Victory rates, average scores
- **Challenge analysis**: Success rates, power distribution
- **Resource management**: Card acquisition, vitality usage

Export results in JSON format for further analysis:
```bash
pnpm cui:benchmark --output my-results.json
```

## 🎓 Tutorial Features

The tutorial mode includes:
- **Step-by-step guidance**: Learn each game mechanic
- **Interactive explanations**: Understand why decisions matter
- **Strategic tips**: Improve your gameplay
- **Progress tracking**: Build skills gradually

## 🐛 Debug Mode Features

Debug mode offers developer tools:
- **Detailed state inspection**: See all game variables
- **Memory monitoring**: Track resource usage
- **Command system**: Execute debug commands
- **Log export**: Save debugging information

### Debug Commands
```
debug help      - Show all debug commands
debug log       - Display recent debug messages
debug state     - Show detailed game state
debug memory    - Show memory usage
debug cards     - Analyze all cards in game
debug export    - Export debug data
```

## 🎮 Gameplay Tips

### Card Selection
- Higher power cards are better for challenges
- Consider vitality cost vs. power gained
- Balance risk and reward

### Challenge Strategy
- Only take on challenges you can win
- Use insurance to boost your power
- Sometimes it's better to skip difficult challenges

### Insurance Management
- Whole life insurance provides stable protection
- Term insurance is cheaper but costs increase with age
- Don't let insurance burden exceed your vitality

## 🔄 Configuration Management

```bash
# Show current configuration
pnpm cui config --show

# Reset to defaults
pnpm cui config --reset

# Export your settings
pnpm cui config --export my-config.json

# Import settings
pnpm cui config --import my-config.json
```

## 🚨 Troubleshooting

### Common Issues

**"Command not found"**
- Ensure tsx is installed: `pnpm install tsx --save-dev`
- Check TypeScript compilation: `pnpm type-check`

**"Animation issues"**
- Try disabling animations: `--no-animations`
- Check terminal compatibility

**"Display problems"**
- Use minimal theme: `--theme minimal`
- Enable compact layout: `--compact`

**"Input not working"**
- Ensure terminal supports interactive input
- Try tutorial mode for guided experience

### Performance Optimization

For better performance:
```bash
# Disable visual effects
pnpm cui:play --no-animations --theme minimal

# Use benchmark mode for testing
pnpm cui:benchmark:quick

# Debug mode for detailed analysis
pnpm cui:debug
```

## 📝 Examples

### Complete Gameplay Session
```bash
# Learn the basics
pnpm cui:tutorial

# Play interactively
pnpm cui:play --theme dark

# Watch AI strategies
pnpm cui:demo --strategy aggressive --games 3

# Test performance
pnpm cui:benchmark:quick

# Debug if needed
pnpm cui:debug
```

### Development Workflow
```bash
# Debug new features
pnpm cui:debug --theme minimal

# Benchmark performance
pnpm cui:benchmark --games 500 --output test-results.json

# Demo for stakeholders
pnpm cui:demo --speed slow --theme colorful
```

## 🎯 Best Practices

1. **Start with tutorial**: Learn the game mechanics
2. **Use appropriate themes**: Match your environment
3. **Adjust speed**: Comfortable pace for your usage
4. **Export benchmarks**: Track performance over time
5. **Use debug mode**: For development and troubleshooting

---

**Happy Gaming!** 🎮✨

The CUI system brings the full Life Enrichment Game experience to your terminal with style, performance, and accessibility in mind.