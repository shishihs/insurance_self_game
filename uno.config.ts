import {
  defineConfig,
  presetAttributify,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'Noto Sans JP:400,700',
        serif: 'Noto Serif JP:400,700',
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    colors: {
      primary: {
        DEFAULT: '#4C6EF5',
        dark: '#364FC7',
        light: '#748FFC',
      },
      success: {
        DEFAULT: '#51CF66',
        dark: '#37B24D',
        light: '#8CE99A',
      },
      warning: {
        DEFAULT: '#FFD43B',
        dark: '#FAB005',
        light: '#FFE066',
      },
      danger: {
        DEFAULT: '#FF6B6B',
        dark: '#F03E3E',
        light: '#FF8787',
      },
    },
  },
  shortcuts: [
    ['btn', 'px-4 py-2 rounded inline-block bg-primary text-white cursor-pointer hover:bg-primary-dark transition-colors'],
    ['btn-success', 'btn bg-success hover:bg-success-dark'],
    ['btn-warning', 'btn bg-warning hover:bg-warning-dark'],
    ['btn-danger', 'btn bg-danger hover:bg-danger-dark'],
    ['card', 'p-4 rounded-lg shadow-md bg-white dark:bg-gray-800'],
  ],
})