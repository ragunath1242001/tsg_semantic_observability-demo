<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, toRefs } from "vue";
import { useLayout } from "../layout/composables/layout";
import { Router } from "vue-router";

const { layoutConfig, onMenuToggle, onConfigButtonClick } = useLayout();

const outsideClickListener = ref(null);
const topbarMenuActive = ref(false);

export interface TopbarProps {
  title: string;
  baseLogoUrl: string;
  user: { name: string };
  router: Router;
}

const props = defineProps<TopbarProps>();

const { title, baseLogoUrl, user, router } = toRefs(props);
console.log(baseLogoUrl);
onMounted(() => {
  bindOutsideClickListener();
});

onBeforeUnmount(() => {
  unbindOutsideClickListener();
});

const logoUrl = computed(() => {
  return `${baseLogoUrl.value}/${
    layoutConfig.darkTheme.value ? "logo-white" : "logo-dark"
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
    <router-link to="/" class="layout-topbar-logo">
      <img :src="logoUrl" alt="logo" />
      <span> {{ title }}</span>
    </router-link>

    <button
      class="p-link layout-menu-button layout-topbar-button"
      @click="onMenuToggle()"
    >
      <i class="pi pi-bars"></i>
    </button>

    <button
      class="p-link layout-topbar-menu-button layout-topbar-button"
      @click="onTopBarMenuButton()"
    >
      <i class="pi pi-ellipsis-v"></i>
    </button>

    <span class="layout-topbar-logo" v-if="title">
      {{ title }}
    </span>

    <div class="layout-topbar-menu" :class="topbarMenuClasses">
      <div class="layout-topbar-button" v-if="user">
        {{ user.name }}
      </div>
      <button
        @click="onConfigButtonClick()"
        class="p-link layout-topbar-button"
      >
        <i class="pi pi-cog"></i>
        <span>Settings</span>
      </button>
      <button @click="logout()" class="p-link layout-topbar-button">
        <i class="pi pi-sign-out"></i>
        <span>Log out</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
