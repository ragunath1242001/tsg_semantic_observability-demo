<script setup lang="ts">
import { ref, computed } from "vue";
import { useUserStore } from "../stores/user.js";

const logoUrl = computed(() => {
  return "layout/images/logo-white.svg";
});

const store = useUserStore();
</script>

<template>
  <div
    class="surface-ground flex align-items-center justify-content-center min-h-screen min-w-screen overflow-hidden"
  >
    <div class="flex flex-column align-items-center justify-content-center">
      <img :src="logoUrl" alt="TSG logo" class="mb-5 w-6rem flex-shrink-0" />
      <div
        style="
          border-radius: 56px;
          padding: 0.3rem;
          background: linear-gradient(
            180deg,
            var(--primary-color) 10%,
            rgba(33, 150, 243, 0) 30%
          );
        "
      >
        <div
          class="w-full surface-card py-8 px-5 sm:px-8"
          style="border-radius: 53px"
        >
          <div class="text-center mb-5">
            <img :src="logoUrl" alt="Image" height="50" class="mb-3" />
            <div class="text-900 text-3xl font-medium mb-3">
              Welcome to the Control Plane UI
            </div>
            <span class="text-600 font-medium">Sign in to continue</span>
          </div>
          <div>
            <Button
              label="Log In"
              type="submit"
              class="w-full p-3 mb-3 text-xl"
              @click="store.login({ redirect: true })"
            ></Button>
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
