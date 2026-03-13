import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mafiaRed: '#ef4444',
        citizenBlue: '#3b82f6',
        darkPanel: '#1f2937',
        darkerBg: '#111827',
      },
    },
  },
  plugins: [],
}
export default config
