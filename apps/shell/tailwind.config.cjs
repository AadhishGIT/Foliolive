/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@foliolive/config/tailwind.preset.js')],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../portfolio-mfe/src/**/*.{js,ts,jsx,tsx}',
    '../risk-mfe/src/**/*.{js,ts,jsx,tsx}',
    '../alerts-mfe/src/**/*.{js,ts,jsx,tsx}',
  ],
};
