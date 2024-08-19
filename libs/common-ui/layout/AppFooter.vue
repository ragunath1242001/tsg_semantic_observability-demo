<script setup lang="ts">
import { useLayout } from "../layout/composables/layout";
import { computed, toRefs } from "vue";

const { layoutConfig } = useLayout();

export interface FooterProps {
  baseLogoUrl: string;
  footerText: string;
}

const props = defineProps<FooterProps>();

const { baseLogoUrl, footerText } = toRefs(props);

const logoUrl = computed(() => {
  return `${baseLogoUrl.value}/${
    layoutConfig.darkTheme ? "logo-white" : "logo-dark"
  }.svg`;
});
</script>

<template>
  <div class="layout-footer">
    <img :src="logoUrl" alt="Logo" height="20" class="mr-2" />
    by
    <span class="font-medium ml-2">{{ footerText }}</span>
  </div>
</template>
<style lang="scss" scoped></style>
