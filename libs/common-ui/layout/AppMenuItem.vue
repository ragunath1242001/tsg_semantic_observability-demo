<script setup lang="ts">
import { ref, onBeforeMount, watch, onMounted, computed } from "vue";
import { RouteLocationNormalizedLoaded } from "vue-router";
import { useLayout } from "../layout/composables/layout";

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
    ? props.parentItemKey + "-" + (props.index ?? 0)
    : String(props.index ?? 0);

  const activeItem =
    layoutConfig.activeMenuItem || layoutConfig.activeMenuItem.value;

  isActiveMenu.value =
    activeItem === itemKey.value || activeItem
      ? activeItem?.value?.startsWith(itemKey.value + "-")
      : false;
});

watch(
  () => layoutConfig.activeMenuItem.value,
  (newVal) => {
    isActiveMenu.value =
      newVal === itemKey.value || newVal.startsWith(itemKey.value + "-");
  }
);
const itemClick = (event, item, index) => {
  if (item.disabled) {
    event.preventDefault();
    return;
  }

  const { overlayMenuActive, staticMenuMobileActive } = layoutState;

  if (
    (item.to || item.url) &&
    (staticMenuMobileActive.value || overlayMenuActive.value)
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
};

const checkActiveRoute = computed(() => {
  return props.route?.path === props.item.to;
});
</script>

<template>
  <li
    :class="{
      'layout-root-menuitem': !child,
      'active-menuitem': isActiveMenu,
    }"
  >
    <div
      v-if="!child && item.visible !== false"
      class="layout-menuitem-root-text"
    >
      {{ item.label }}
    </div>
    <a
      v-if="(!item.to || item.items) && item.visible !== false"
      :href="item.url"
      @click="itemClick($event, item, index)"
      :class="item.class"
      :target="item.target"
      tabindex="0"
    >
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i
        class="pi pi-fw pi-angle-down layout-submenu-toggler"
        v-if="item.items"
      ></i>
    </a>
    <router-link
      v-if="item.to && !item.items && item.visible !== false"
      @click="itemClick($event, item, index)"
      :class="[item.class, { 'active-route': checkActiveRoute }]"
      tabindex="0"
      :to="item.to"
    >
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i
        class="pi pi-fw pi-angle-down layout-submenu-toggler"
        v-if="item.items"
      ></i>
      <span class="p-1">
        <Badge
          v-if="item.badge"
          class="p-overlay-badge p-0"
          severity="danger"
          :value="item.badge"
        ></Badge>
      </span>
    </router-link>
    <Transition
      v-if="item.items && item.visible !== false"
      name="layout-submenu"
    >
      <ul v-show="!child ? true : isActiveMenu" class="layout-submenu">
        <app-menu-item
          v-for="(child, i) in item.items"
          :key="child"
          :index="i"
          :item="child"
          :parentItemKey="itemKey"
          :child="true"
          :route="route"
        ></app-menu-item>
      </ul>
    </Transition>
  </li>
</template>

<style lang="scss" scoped></style>
