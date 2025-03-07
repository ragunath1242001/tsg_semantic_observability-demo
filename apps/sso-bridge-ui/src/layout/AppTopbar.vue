<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import { useLayout } from "@/layout/composables/layout";
import { useAuthStore } from "@/stores/user";

const { onMenuToggle, toggleDarkMode, isDarkTheme, layoutConfig } = useLayout();

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const logoUrl = computed(() => {
  return `/layout/images/${layoutConfig.darkTheme ? "logo-white" : "logo-dark"}.svg`;
});

const topbarMenuClasses = ref("hidden");
const onTopBarMenuButton = () => {
  if (topbarMenuClasses.value === "hidden") {
    topbarMenuClasses.value = "";
  } else {
    topbarMenuClasses.value = "hidden";
  }
};

const logout = () => {
  authStore.logout();
};
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

      <button
        class="layout-topbar-menu-button layout-topbar-action"
        @click="onTopBarMenuButton">
        <i class="pi pi-ellipsis-v"></i>
      </button>
      <div class="layout-topbar-menu lg:block" :class="topbarMenuClasses">
        <div class="layout-topbar-menu-content">
          <div v-if="user" class="layout-topbar-text">
            <div>
              <i class="pi pi-user"></i>
              {{ user.username }}
            </div>
          </div>
          <button class="layout-topbar-action" @click="logout()">
            <i class="pi pi-sign-out"></i>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-topbar-text {
  display: inline-flex;
  justify-content: left;
  align-items: center;
  height: 2.5rem;
  color: var(--text-color);
  max-width: 8rem;

  div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 8rem;
  }
  i {
    font-size: 1.25rem;
    display: none;
  }

  span {
    font-size: 1rem;
    display: none;
  }

  &.layout-topbar-text-highlight {
    background-color: var(--primary-color);
    color: var(--primary-contrast-color);
  }
}

@media (max-width: 991px) {
  .layout-topbar-text {
    display: flex;
    width: 100%;
    height: auto;
    justify-content: flex-start;
    border-radius: var(--content-border-radius);
    padding: 0.5rem 1rem;
    div {
      display: block;
      min-width: 12rem;
    }
    i {
      font-size: 1rem;
      margin-right: 0.5rem;
      display: inline;
    }

    span {
      font-weight: bold;
      display: inline;
    }
  }
}
</style>
