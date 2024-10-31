<script setup lang="ts">
import { ref, onBeforeMount, watch, onMounted, computed } from "vue";
import { RouteLocationNormalizedLoaded } from "vue-router";
import { useLayout } from "./composables/layout";

const { layoutConfig, layoutState, setActiveMenuItem, onMenuToggle } =
  useLayout();

interface MenuItemProps {
  item?: any;
  index?: number;
  child?: boolean;
  parentItemKey?: string;
  route: RouteLocationNormalizedLoaded;
}

const props = defineProps<MenuItemProps>();

const isActiveMenu = ref(false);
const itemKey = ref();

onBeforeMount(() => {
  itemKey.value = props.parentItemKey
    ? props.parentItemKey + "-" + props.index
    : String(props.index);

  const activeItem = layoutState.activeMenuItem;

  isActiveMenu.value =
    activeItem === itemKey.value || activeItem
      ? activeItem.startsWith(itemKey.value + "-")
      : false;
});

watch(
  () => layoutState.activeMenuItem,
  (newVal) => {
    isActiveMenu.value =
      newVal === itemKey.value || newVal.startsWith(itemKey.value + "-");
  }
);

function itemClick(event, item) {
  if (item.disabled) {
    event.preventDefault();
    return;
  }

  if (
    (item.to || item.url) &&
    (layoutState.staticMenuMobileActive || layoutState.overlayMenuActive)
  ) {
    onMenuToggle();
  }

  if (item.command) {
    item.command({ originalEvent: event, item: item });
  }

  const foundItemKey = item.items
    ? isActiveMenu.value
      ? props.parentItemKey
      : itemKey
    : itemKey.value;

  setActiveMenuItem(foundItemKey);
}

function checkActiveRoute(item) {
  return props.route.path === item.to;
}
</script>

<template>
  <li
    :class="{
      'layout-root-menuitem': !child,
      'active-menuitem': isActiveMenu
    }">
    <div
      v-if="!child && item.visible !== false"
      class="layout-menuitem-root-text">
      {{ item.label }}
    </div>
    <a
      v-if="(!item.to || item.items) && item.visible !== false"
      :href="item.url"
      @click="itemClick($event, item)"
      :class="item.class"
      :target="item.target"
      tabindex="0">
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i
        class="pi pi-fw pi-angle-down layout-submenu-toggler"
        v-if="item.items"></i>
    </a>
    <router-link
      v-if="item.to && !item.items && item.visible !== false"
      @click="itemClick($event, item)"
      :class="[item.class, { 'active-route': checkActiveRoute(item) }]"
      tabindex="0"
      :to="item.to">
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <Badge
        v-if="item.badge"
        :value="item.badge"
        size="small"
        class="ml-1"
        severity="danger">
      </Badge>
      <i
        class="pi pi-fw pi-angle-down layout-submenu-toggler"
        v-if="item.items"></i>
    </router-link>
    <Transition
      v-if="item.items && item.visible !== false"
      name="layout-submenu">
      <ul v-show="!child ? true : isActiveMenu" class="layout-submenu">
        <app-menu-item
          v-for="(child, i) in item.items"
          :key="child"
          :index="i"
          :item="child"
          :parentItemKey="itemKey"
          :child="true"
          :route="route"></app-menu-item>
      </ul>
    </Transition>
  </li>
</template>

<style lang="scss" scoped></style>
