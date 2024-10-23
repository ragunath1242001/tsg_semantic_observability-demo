<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, toRefs } from "vue";
import { useLayout } from "./composables/layout";
import { Router } from "vue-router";

const {
  onMenuToggle,
  toggleDarkMode,
  isDarkTheme,
  layoutConfig,
  onConfigButtonClick,
} = useLayout();

const outsideClickListener = ref(null);
const topbarMenuActive = ref(false);

export interface TopbarProps {
  title: string;
  name: string;
  baseLogoUrl: string;
  user: { name: string };
  router: Router;
}

const props = defineProps<TopbarProps>();

const { title, baseLogoUrl, user, router } = toRefs(props);
onMounted(() => {
  bindOutsideClickListener();
});

onBeforeUnmount(() => {
  unbindOutsideClickListener();
});

const logoUrl = computed(() => {
  return `${baseLogoUrl.value}/${
    layoutConfig.darkTheme ? "logo-white" : "logo-dark"
  }.svg`;
});

const onTopBarMenuButton = () => {
  topbarMenuActive.value = !topbarMenuActive.value;
};

const topbarMenuClasses = computed(() => {
  return {
    "hidden": !topbarMenuActive.value,
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
const isOutsideClicked = (event) => {
  if (!topbarMenuActive.value) return;

  const sidebarEl = document.querySelector(".layout-topbar-menu");
  const topbarEl = document.querySelector(".layout-topbar-menu-button");

  return !(
    sidebarEl.isSameNode(event.target) ||
    sidebarEl.contains(event.target) ||
    topbarEl.isSameNode(event.target) ||
    topbarEl.contains(event.target)
  );
};

const logout = () => {
  localStorage.removeItem("username");
  localStorage.removeItem("password");
  router.value.push("/login");
};
</script>

<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button
        class="layout-menu-button layout-topbar-action"
        @click="onMenuToggle"
      >
        <i class="pi pi-bars"></i>
      </button>
      <router-link to="/" class="layout-topbar-logo">
        <img :src="logoUrl" alt="logo" />
        <span class="pr-2"> {{ title }}</span>
      </router-link>
    </div>
    <span class="layout-topbar-logo" v-if="name">
      {{ name }}
    </span>
    <div class="layout-topbar-actions">
      <div class="layout-config-menu">
        <button
          type="button"
          class="layout-topbar-action"
          @click="toggleDarkMode"
        >
          <i
            :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"
          ></i>
        </button>
      </div>

      <button
        class="layout-topbar-menu-button layout-topbar-action"
        @click="onTopBarMenuButton"
      >
        <i class="pi pi-ellipsis-v"></i>
      </button>
      <div class="layout-topbar-menu lg:block" :class="topbarMenuClasses">
        <div class="layout-topbar-menu-content">
          <div class="layout-topbar-text" v-if="user">
            <div>
              <i class="pi pi-user"></i>
              {{ user.name }}
            </div>
          </div>
          <button @click="onConfigButtonClick" class="layout-topbar-action">
            <i class="pi pi-cog"></i>
            <span>Settings</span>
          </button>
          <button @click="logout()" class="layout-topbar-action">
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
