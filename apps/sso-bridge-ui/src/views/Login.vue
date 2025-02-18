<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout.js";
import FloatingConfigurator from "@tsg-dsp/common-ui/components/FloatingConfigurator.vue";
import { useToast } from "primevue";
import { useAuthStore } from "../stores/user";
import { useRoute } from "vue-router";
import http from "../utils/http";

const route = useRoute();
const authorizationRequest = ref<Record<string, string>>(null);

if (route.query.response_type) {
  authorizationRequest.value = Object.fromEntries(
    Object.entries(route.query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value
    ])
  );
}

const toast = useToast();

const store = useAuthStore();

const username = ref("");
const password = ref("");

const login = async (currentUser: boolean = false) => {
  try {
    if (authorizationRequest.value) {
      const body = currentUser
        ? {}
        : { username: username.value, password: password.value };
      const response = await http.post<{ url: string }>("/oauth/login", body, {
        params: {
          redirect: false,
          ...authorizationRequest.value
        }
      });
      window.location.replace(response.data.url);
    } else {
      await store.login(username.value, password.value);
    }
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Invalid credentials"
    });
  }
};

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
    class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen -mt-11 overflow-hidden">
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
              Welcome to the SSO Bridge!
            </div>
            <span v-if="!store.user" class="text-muted-color font-medium"
              >Sign in to continue</span
            >
          </div>
          <div v-if="store.user" class="text-center mb-4">
            <span class="text-muted-color font-medium">Continue as:</span>
            <Button
              :label="`${store.user.username}`"
              class="w-full mt-3 mb-6"
              severity="info"
              @click="login(true)"></Button>
            <span class="text-muted-color font-medium"
              >Or sign in with a different account:</span
            >
          </div>
          <div>
            <form @submit.prevent="login(false)">
              <label
                for="email1"
                class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2"
                >Username</label
              >
              <InputText
                id="email1"
                v-model="username"
                type="text"
                placeholder="Username"
                class="w-full mb-8" />

              <label
                for="password1"
                class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2"
                >Password</label
              >
              <Password
                id="password1"
                v-model="password"
                placeholder="Password"
                :toggle-mask="true"
                class="w-full mb-4"
                fluid
                :feedback="false"></Password>

              <Button label="Sign In" class="w-full" type="submit"></Button>
            </form>
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
