// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/block-order': ['error', { order: ['template', 'script[setup]', 'style'] }],
  },
})
