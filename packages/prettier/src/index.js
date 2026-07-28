import { createRequire } from 'node:module'

const requireFrom = createRequire(import.meta.url)

/** @type {import("prettier").Config} */
const config = {
  iniSpaceAroundEquals: true,
  plugins: [requireFrom.resolve('prettier-plugin-ini')],
  proseWrap: 'always',
  semi: false,
  singleQuote: true,
  overrides: [
    {
      files: ['.editorconfig'],
      options: {
        parser: 'ini',
      },
    },
  ],
}

export default config
