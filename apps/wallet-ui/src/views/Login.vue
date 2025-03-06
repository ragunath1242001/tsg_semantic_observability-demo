<script setup lang="ts">
import { computed } from "vue";
import FloatingConfigurator from "@tsg-dsp/common-ui/components/FloatingConfigurator.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout.js";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";

const store = useUserStore();
const { layoutConfig } = useLayout();

const logoUrl = computed(() => {
  return `layout/images/${
    layoutConfig.darkTheme ? "logo-white" : "logo-dark"
  }.svg`;
});
</script>

<template>
  <FloatingConfigurator />
  <div
    class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div
        style="
          border-radius: 56px;
          padding: 0.3rem;
          background: linear-gradient(
            180deg,
            var(--primary-color) 10%,
            rgba(33, 150, 243, 0) 30%
          );
        ">
        <div
          class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20"
          style="border-radius: 53px">
          <div class="text-center mb-8">
            <img :src="logoUrl" class="mb-6 w-40 shrink-0 mx-auto" alt="logo" />
            <div
              class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">
              Welcome to the TSG Wallet UI!
            </div>
            <span class="text-muted-color font-medium"
              >Sign in to continue</span
            >
          </div>

          <div>
            <Button
              label="Log In"
              class="w-full"
              as="router-link"
              to="/"
              @click="store.login()"></Button>
          </div>
          <div class="text-center mt-4">
            <span class="text-muted-color font-medium"
              >Don't have an account yet?</span
            >
            <Button
              label="Proceed without login"
              class="w-full mt-3"
              as="router-link"
              to="/retrieve-credential"></Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pi-eye {
  transform: scale(1.6);
  margin-right: 1rem;
}

.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>
