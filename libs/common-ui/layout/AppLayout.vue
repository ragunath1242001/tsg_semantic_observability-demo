<script setup lang="ts">
import { watch, ref, toRefs } from "vue";
import AppTopbar, { TopbarProps } from "./AppTopbar.vue";
import AppFooter, { FooterProps } from "./AppFooter.vue";
import AppSidebar from "./AppSidebar.vue";
import { useLayout } from "./composables/layout";
import { MenuProps } from "./AppMenu.vue";

const { layoutConfig, layoutState, isSidebarActive, resetMenu } = useLayout();

const props = defineProps<{
  topbar: TopbarProps;
  sidebar: MenuProps;
  footer: FooterProps;
}>();

const { topbar, sidebar, footer } = toRefs(props);
const outsideClickListener = ref<any>(null);

watch(isSidebarActive, (newVal) => {
  if (newVal) {
    bindOutsideClickListener();
  } else {
    unbindOutsideClickListener();
  }
});

function bindOutsideClickListener() {
  if (!outsideClickListener.value) {
    outsideClickListener.value = (event) => {
      if (isOutsideClicked(event)) {
        resetMenu();
      }
    };
    document.addEventListener("click", outsideClickListener.value);
  }
}

function unbindOutsideClickListener() {
  if (outsideClickListener.value) {
    document.removeEventListener("click", outsideClickListener.value);
    outsideClickListener.value = null;
  }
}

function isOutsideClicked(event) {
  const sidebarEl = document.querySelector(".layout-sidebar");
  const topbarEl = document.querySelector(".layout-menu-button");

  return !(
    sidebarEl.isSameNode(event.target) ||
    sidebarEl.contains(event.target) ||
    topbarEl.isSameNode(event.target) ||
    topbarEl.contains(event.target)
  );
}
</script>

<template>
  <app-topbar
    :title="topbar.title"
    :name="topbar.name"
    :baseLogoUrl="topbar.baseLogoUrl"
    :user="topbar.user"
    :router="topbar.router"></app-topbar>
  <div
    class="layout-sidebar"
    style="
      border: 1px solid var(--surface-border);
      box-shadow: var(--p-card-shadow);
    ">
    <app-sidebar :menu="sidebar.menu" :route="sidebar.route"></app-sidebar>
  </div>
  <div class="layout-main-container">
    <div class="layout-main">
      <router-view></router-view>
    </div>
    <app-footer
      :baseLogoUrl="footer.baseLogoUrl"
      :footerText="footer.footerText"></app-footer>
  </div>
  <Toast />
</template>

<style lang="scss" scoped></style>
