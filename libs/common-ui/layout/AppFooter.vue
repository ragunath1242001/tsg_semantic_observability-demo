<script setup lang="ts">
import { toRefs } from "vue";

export interface FooterProps {
  logoUrl: string;
  footerText: string;
}

const props = defineProps<FooterProps>();

const { logoUrl, footerText } = toRefs(props);
</script>

<template>
  <div class="layout-footer">
    <img :src="logoUrl" alt="Logo" height="20" class="mr-2" />
    by
    <span class="font-medium ml-2">{{ footerText }}</span>
  </div>
</template>
<style lang="scss" scoped></style>
