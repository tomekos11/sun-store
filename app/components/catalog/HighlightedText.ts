import { defineComponent, h } from 'vue'

// render function instead of a template - template whitespace added spaces around <mark>
export default defineComponent({
  name: 'HighlightedText',
  props: {
    text: { type: String, required: true },
    query: { type: String, default: '' },
  },
  setup(props) {
    return () => highlight(props.text, props.query).map(part =>
      part.match ? h('mark', { class: 'rounded-sm bg-primary/15 px-px text-inherit' }, part.text) : part.text,
    )
  },
})
