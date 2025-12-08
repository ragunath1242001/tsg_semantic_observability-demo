<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, toRefs } from "vue";
import { Router } from "vue-router";

import { useUserStore } from "../stores/user";
import { useLayout } from "./composables/layout";

const { onMenuToggle, toggleDarkMode, isDarkTheme, onConfigButtonClick } =
  useLayout();

const outsideClickListener = ref<((ev: MouseEvent) => void) | null>(null);
const topbarMenuActive = ref(false);

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

export interface TopbarProps {
  title: string;
  name: string;
  logoUrl: string;
  needSignin?: boolean;
  router: Router;
  showSettings?: boolean;
}

const props = withDefaults(defineProps<TopbarProps>(), {
  showSettings: true
});

const { title, logoUrl, needSignin, router, showSettings } = toRefs(props);
onMounted(() => {
  bindOutsideClickListener();
});

onBeforeUnmount(() => {
  unbindOutsideClickListener();
});

const onTopBarMenuButton = () => {
  topbarMenuActive.value = !topbarMenuActive.value;
};

const topbarMenuClasses = computed(() => {
  return {
    "max-lg:hidden": !topbarMenuActive.value // Only hide on screens smaller than lg when menu is inactive
  };
});

const bindOutsideClickListener = () => {
  if (!outsideClickListener.value) {
    outsideClickListener.value = (event) => {
      if (isOutsideClicked(event)) {
        topbarMenuActive.value = false;
      }
    };
    document.addEventListener("click", outsideClickListener.value);
  }
};
const unbindOutsideClickListener = () => {
  if (outsideClickListener.value) {
    document.removeEventListener("click", outsideClickListener.value);
    outsideClickListener.value = null;
  }
};
const isOutsideClicked = (event: MouseEvent) => {
  if (!topbarMenuActive.value) return;
  if (!event.target) return false;
  const sidebarEl = document.querySelector(".layout-topbar-menu");
  const topbarEl = document.querySelector(".layout-topbar-menu-button");

  return !(
    sidebarEl?.isSameNode(event.target as Node) ||
    sidebarEl?.contains(event.target as Node) ||
    topbarEl?.isSameNode(event.target as Node) ||
    topbarEl?.contains(event.target as Node)
  );
};

const login = () => {
  router.value.push("/login");
};

const logout = () => {
  userStore.logout();
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
      </router-link>
    </div>
    <div class="layout-topbar-title">
      <span v-if="name" class="layout-topbar-title-desktop"
        >{{ name }} - {{ title }}</span
      >
      <span v-else class="layout-topbar-title-desktop">{{ title }}</span>

      <div class="layout-topbar-title-mobile">
        <div v-if="name" class="layout-topbar-title-name">{{ name }}</div>
        <div class="layout-topbar-title-subtitle">{{ title }}</div>
      </div>
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
          <div v-if="user && !needSignin" class="layout-topbar-text">
            <div>
              <i class="pi pi-user"></i>
              {{ user.name }}
            </div>
          </div>
          <button
            v-if="needSignin"
            class="layout-topbar-action"
            @click="login()">
            <i class="pi pi-sign-in"></i>
            <span>Sign in</span>
          </button>
          <button
            v-if="!needSignin && !userStore.isReadOnly && showSettings"
            class="layout-topbar-action"
            @click="onConfigButtonClick">
            <i class="pi pi-cog"></i>
            <span>Settings</span>
          </button>
          <button
            v-if="!needSignin"
            class="layout-topbar-action"
            @click="logout()">
            <i class="pi pi-sign-out"></i>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-topbar-title {
  display: inline-flex;
  justify-content: left;
  align-items: center;
  height: 2.5rem;
  color: var(--text-color);
  padding: 0.5rem 1rem;
  font-size: 1.5rem;
  margin-left: 1rem;
  margin-right: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;

  .layout-topbar-title-desktop {
    display: inline;
  }

  .layout-topbar-title-mobile {
    display: none;
  }
}

.layout-topbar-text {
  display: inline-flex;
  justify-content: left;
  align-items: center;
  height: 2.5rem;
  color: var(--text-color);
  padding: 0.5rem 1rem;

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

@media (min-width: 992px) {
  .layout-topbar-title {
    font-size: 1.5rem !important;
  }
}

@media (max-width: 991px) {
  .layout-topbar-title {
    display: inline-flex;
    justify-content: left;
    align-items: center;
    height: 2.5rem;
    color: var(--text-color);
    padding: 0.5rem 1rem;
    font-size: 1rem !important;
    margin-left: 0.5rem;
    margin-right: 0.5rem;
    flex-shrink: 1;
  }

  @media (max-width: 480px) {
    .layout-topbar-title {
      font-size: 0.9rem !important;
      margin-left: 0.25rem;
      margin-right: 0.25rem;
      flex-shrink: 1;
      white-space: normal;

      .layout-topbar-title-desktop {
        display: none;
      }

      .layout-topbar-title-mobile {
        display: block;

        .layout-topbar-title-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-color);
          line-height: 1.2;
        }

        .layout-topbar-title-subtitle {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-color-secondary);
          line-height: 1.1;
          margin-top: 0.1rem;
        }
      }
    }
  }

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
