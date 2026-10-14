import type { Preview } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from '../src/theme/theme-provider';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#090d16' },
        { name: 'light', value: '#ffffff' },
        { name: 'slate', value: '#0f172a' },
      ],
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider defaultTheme="dark">
        <div className="p-4 bg-background text-foreground min-h-[100px] flex items-center justify-center font-sans antialiased">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
