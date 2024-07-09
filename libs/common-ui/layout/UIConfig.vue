<script setup lang="ts">
import { ref, watch } from "vue";
import { useLayout } from "./composables/layout";
import { usePrimeVue } from "primevue/config";

const { setScale, layoutState, layoutConfig } = useLayout();

console.log(layoutConfig.darkTheme.value);
watch(layoutConfig.darkTheme, () => {
  console.log(layoutConfig.darkTheme.value);
});

const $primevue = usePrimeVue();

const decrementScale = () => {
  setScale(layoutConfig.scale.value - 1);
  applyScale();
};
const incrementScale = () => {
  setScale(layoutConfig.scale.value + 1);
  applyScale();
};

const applyScale = () => {
  document.documentElement.style.fontSize = layoutConfig.scale.value + "px";
};

const scales = ref([12, 13, 14, 15, 16]);
const onDarkModeChange = (value) => {
  const newThemeName = value
    ? layoutConfig.theme.value.replace("light", "dark")
    : layoutConfig.theme.value.replace("dark", "light");

  layoutConfig.darkTheme.value = value;
  localStorage.setItem("theme", newThemeName);
  onChangeTheme(newThemeName, value);
};

const onChangeTheme = (theme, mode) => {
  $primevue.changeTheme(layoutConfig.theme.value, theme, "theme-css", () => {
    layoutConfig.theme.value = theme;
    layoutConfig.darkTheme.value = mode;
  });
};
</script>
<template>
  <section
    class="pb-4 flex align-items-center justify-content-between border-bottom-1 surface-border"
  >
    <span class="text-xl font-semibold">Scale</span>
    <div
      class="flex align-items-center gap-2 border-1 surface-border py-1 px-2"
      style="border-radius: 30px"
    >
      <Button
        icon="pi pi-minus"
        @click="decrementScale"
        text
        rounded
        :disabled="layoutConfig.scale.value === scales[0]"
      />
      <i
        v-for="s in scales"
        :key="s"
        :class="[
          'pi pi-circle-fill text-sm text-200',
          { 'text-lg text-primary': s === layoutConfig.scale.value },
        ]"
      />

      <Button
        icon="pi pi-plus"
        @click="incrementScale"
        text
        rounded
        :disabled="layoutConfig.scale.value === scales[scales.length - 1]"
      />
    </div>
  </section>

  <section
    class="py-4 flex align-items-center justify-content-between border-bottom-1 surface-border"
  >
    <span :class="['text-xl font-semibold']">Dark Mode</span>
    <ToggleButton
      :modelValue="layoutConfig.darkTheme.value"
      @update:modelValue="onDarkModeChange"
      onLabel="On"
      offLabel="Off"
    />
  </section>
</template>
