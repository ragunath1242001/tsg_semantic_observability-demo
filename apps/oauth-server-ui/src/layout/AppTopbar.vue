<script setup>
import { useLayout } from "@/layout/composables/layout";
import { computed } from "vue";

const { onMenuToggle, toggleDarkMode, isDarkTheme, layoutConfig } = useLayout();
const logoUrl = computed(() => {
  return `/layout/images/${layoutConfig.darkTheme ? "logo-white" : "logo-dark"}.svg`;
});
</script>

<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button
        class="layout-menu-button layout-topbar-action"
        @click="onMenuToggle">
        <i class="pi pi-bars"></i>
      </button>
      <router-link to="/" class="layout-topbar-logo">
        <img :src="logoUrl" alt="logo" />

        <span>Oauth Server</span>
      </router-link>
    </div>

    <div class="layout-topbar-actions">
      <div class="layout-config-menu">
        <button
          type="button"
          class="layout-topbar-action"
          @click="toggleDarkMode">
          <i
            :class="[
              'pi',
              { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }
            ]"></i>
        </button>
      </div>
    </div>
  </div>
</template>
