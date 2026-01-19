<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from "vue";
import { RouteLocationNormalizedLoaded } from "vue-router";

import { useLayout } from "./composables/layout";

const { layoutState, setActiveMenuItem, onMenuToggle } = useLayout();

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

const childItems = computed<any[] | null>(() => {
  return props.item && props.item.items && Array.isArray(props.item.items)
    ? props.item.items
    : null;
});

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
      v-if="(!item.to || childItems) && item.visible !== false"
      :href="item.url"
      :class="item.class"
      :target="item.target"
      tabindex="0"
      @click="itemClick($event, item)">
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i
        v-if="childItems"
        class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
    </a>
    <router-link
      v-if="item.to && !childItems && item.visible !== false"
      :class="[item.class, { 'active-route': checkActiveRoute(item) }]"
      tabindex="0"
      :to="item.to"
      @click="itemClick($event, item)">
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
        v-if="childItems"
        class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
    </router-link>
    <Transition
      v-if="childItems && item.visible !== false"
      name="layout-submenu">
      <ul v-show="!child ? true : isActiveMenu" class="layout-submenu">
        <app-menu-item
          v-for="(child, i) in childItems"
          :key="`item-${i}-${child.label}`"
          :index="i"
          :item="child"
          :parent-item-key="itemKey"
          :child="true"
          :route="route"></app-menu-item>
      </ul>
    </Transition>
  </li>
</template>

<style lang="scss" scoped></style>
