<script setup lang="ts">
import { ref, computed } from "vue";
import router from "../router/index.js";
import { useToast } from "primevue/usetoast";
import { store } from "../store/index.js";

const toast = useToast();

const username = ref("");
const password = ref("");


const logoUrl = computed(() => {
  return "layout/images/logo-white.svg";
});

const login = async (e) => {
  try {
    await store.dispatch("login", {
      username: username.value,
      password: password.value,
    });
    toast.add({
      severity: "success",
      summary: "Logged in",
      detail: "Successfully logged in!",
      life: 5000,
    });
    router.push("/");
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Login failed",
      detail: "Unsuccessful login attempt",
      life: 10000,
    });
  }
};
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
              Welcome to the TSG HTTP Data Plane UI
            </div>
            <span class="text-600 font-medium"
              >Sign in to continue</span
            >
          </div>
          <div>
            <form ref="loginForm" @submit.prevent="login">
              <div class="field">
                <label
                  for="username"
                  class="block text-900 text-xl font-medium mb-2"
                  >Username</label
                >
                <InputText
                  id="username"
                  type="text"
                  placeholder="Username"
                  class="w-full mb-5"
                  style="padding: 1rem"
                  required
                  v-model="username"
                />
              </div>
              <div class="field">
                <label
                  for="password1"
                  class="block text-900 font-medium text-xl mb-2"
                  >Password</label
                >
                <Password
                  id="password1"
                  v-model="password"
                  placeholder="Password"
                  :toggleMask="true"
                  :feedback="false"
                  class="w-full mb-3"
                  inputClass="w-full"
                  required
                  :inputStyle="{ padding: '1rem' }"
                ></Password>
              </div>
              <div class="field">
                <Button
                  label="Sign In"
                  type="submit"
                  class="w-full p-3 mb-3 text-xl"
                ></Button>
              </div>
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
