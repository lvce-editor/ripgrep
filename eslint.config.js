import * as config from '@lvce-editor/eslint-config'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  ...config.default,
  ...config.recommendedActions,
  {
    ignores: ['src/index.d.ts'],
  },
])
