<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, toRefs } from "vue";
import { useLayout } from "../layout/composables/layout";
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
    "layout-topbar-menu-mobile-active": topbarMenuActive.value,
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
        <span> {{ title }}</span>
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

      <div class="layout-topbar-menu" :class="topbarMenuClasses">
        <div class="layout-topbar-menu-content">
          <div class="layout-topbar-action" v-if="user">
            {{ user.name }}
          </div>
          <button @click="onConfigButtonClick" class="layout-topbar-action">
            <i class="pi pi-cog"></i>
          </button>
          <button @click="logout()" class="layout-topbar-action">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
