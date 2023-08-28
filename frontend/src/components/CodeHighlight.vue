<template>
  <pre class="code-highlight">
    <div class="hljs theme-github p-3 box"><code v-html="highlighted"></code></div>
  </pre>
</template>

<script lang="ts">
import Vue from "vue";

import hljs from "highlight.js";
import "highlight.js/styles/github.css";

export default Vue.extend({
  name: "code-highlight",
  props: {
    language: {
      type: String,
      default: "json",
    },
    code: {
      required: true,
    },
  },
  data() {
    return {
      languageClass: `language-${this.language}`,
    };
  },
  computed: {
    highlighted() {
      const result = hljs.highlight(JSON.stringify(this.code, null, 2), { language: this.language });
      return result.value;
    },
  }
});
</script>

<style lang="scss">
.code-highlight {
  background: transparent;
}
.hljs {
  background: hsl(0, 0%, 98%);
  overflow-x: auto;
}
</style>