<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, toRefs } from "vue";
import { useLayout } from "./composables/layout";
import { Router } from "vue-router";
import { useUserStore } from "../stores/user";
import { storeToRefs } from "pinia";

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
}

const props = defineProps<TopbarProps>();

const { title, logoUrl, needSignin, router } = toRefs(props);
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
    hidden: !topbarMenuActive.value
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
        <span class="pr-2"> {{ title }}</span>
      </router-link>
    </div>
    <span v-if="name" class="layout-topbar-logo">
      {{ name }}
    </span>
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
            v-if="!needSignin"
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
