import { computed, ref, reactive, readonly, watch } from "vue";

const defaultConfig = {
  preset: "Lara",
  primary: "blue",
  surface: null,
  darkTheme:
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  menuMode: "static",
};

const configStorageItem = `layoutConfig-${location.pathname}`;

function storedConfig() {
  const config =
    localStorage.getItem(configStorageItem) ?? JSON.stringify(defaultConfig);
  localStorage.setItem(config);
  const parsed = JSON.parse(config);
  if (parsed.darkTheme) {
    document.documentElement.classList.add("app-dark");
  }
  return parsed;
}

const layoutConfig = reactive(storedConfig());

watch(layoutConfig, (newValue) => {
  localStorage.setItem(configStorageItem, JSON.stringify(newValue));
});

const layoutState = reactive({
  staticMenuDesktopInactive: false,
  overlayMenuActive: false,
  profileSidebarVisible: false,
  configSidebarVisible: false,
  staticMenuMobileActive: false,
  menuHoverActive: false,
  activeMenuItem: null,
});

let configSidebarVisible = ref(false);

export function useLayout() {
  const setPrimary = (value) => {
    layoutConfig.primary = value;
  };

  const setSurface = (value) => {
    layoutConfig.surface = value;
  };

  const setPreset = (value) => {
    layoutConfig.preset = value;
  };

  const setActiveMenuItem = (item) => {
    layoutState.activeMenuItem = item.value || item;
  };

  const onConfigButtonClick = () => {
    configSidebarVisible.value = !configSidebarVisible.value;
  };

  const setMenuMode = (mode) => {
    layoutConfig.menuMode = mode;
  };

  const toggleDarkMode = () => {
    if (!document.startViewTransition) {
      executeDarkModeToggle();

      return;
    }

    document.startViewTransition(() => executeDarkModeToggle(event));
  };

  const executeDarkModeToggle = () => {
    layoutConfig.darkTheme = !layoutConfig.darkTheme;
    document.documentElement.classList.toggle("app-dark");
  };

  const onMenuToggle = () => {
    if (layoutConfig.menuMode === "overlay") {
      layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
    }

    if (window.innerWidth > 991) {
      layoutState.staticMenuDesktopInactive =
        !layoutState.staticMenuDesktopInactive;
    } else {
      layoutState.staticMenuMobileActive = !layoutState.staticMenuMobileActive;
    }
  };

  const resetMenu = () => {
    layoutState.overlayMenuActive = false;
    layoutState.staticMenuMobileActive = false;
    layoutState.menuHoverActive = false;
  };

  const isSidebarActive = computed(
    () => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive
  );

  const isDarkTheme = computed(() => layoutConfig.darkTheme);

  const getPrimary = computed(() => layoutConfig.primary);

  const getSurface = computed(() => layoutConfig.surface);

  return {
    layoutConfig: readonly(layoutConfig),
    layoutState: readonly(layoutState),
    onMenuToggle,
    onConfigButtonClick,
    configSidebarVisible,
    isSidebarActive,
    isDarkTheme,
    getPrimary,
    getSurface,
    setActiveMenuItem,
    toggleDarkMode,
    setPrimary,
    setSurface,
    setPreset,
    resetMenu,
    setMenuMode,
  };
}
