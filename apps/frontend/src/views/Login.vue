<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import router from "../router/index.js";
import { useToast } from "primevue/usetoast";
import { axiosInstance, store } from "../store/index.js";

interface LoginForms {
  login: {
    clientId: string;
    password: string;
  };
  register: {
    clientId: string;
    password: string;
    didId: string;
  };
  reset: {
    clientId: string;
    email: string;
  };
  change: {
    password: string;
  }
}

const loginForm = ref<HTMLFormElement>(null);
const registerForm = ref<HTMLFormElement>(null);
const forgotPasswordForm = ref<HTMLFormElement>(null);
const resetPasswordForm = ref<HTMLFormElement>(null);

const toast = useToast();

const currentForm = ref<'login' | 'registration' | 'reset' | 'change'>('login')
const resetCode = ref<string | null>(null);
const resetClient = ref<string | null>(null);
const forms = ref<LoginForms>({
  login: {
    clientId: "",
    password: "",
  },
  register: {
    clientId: "",
    password: "",
    didId: "",
  },
  reset: {
    clientId: "",
    email: ""
  },
  change: {
    password: ""
  }
});


const logoUrl = computed(() => {
  return "layout/images/logo-white.svg";
});

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('action') && urlParams.get('action') === 'verify') {
      try {
        await axiosInstance.post(`auth/verify?clientId=${encodeURIComponent(urlParams.get('clientId') || '-')}&code=${encodeURIComponent(urlParams.get('code') || '-')}`);
        toast.add({severity: 'success', summary: 'Verified', detail: 'Email address verified, you can now login', life: 5000});
        router.push("/");
      } catch (e) {
        toast.add({severity: 'error', summary: 'Verification failed', detail: 'Cannot verify account', life: 5000});
      }
    }
    if (urlParams.has('forgot') && urlParams.has('clientId')) {
      resetCode.value = urlParams.get('forgot');
      resetClient.value = urlParams.get('clientId');
    }
    if (urlParams.has('verified')) {
      toast.add({severity: 'success', summary: 'Verified', detail: 'Email address verified, you can now login', life: 5000});
    }
})

const login = async (e) => {
  if (!loginForm.value.checkValidity()) {
    toast.add({severity: 'error', summary: 'Login error', detail: 'Please fill in all elements', life: 10000});
    return;
  }
  try {
    await store.dispatch('login', {
      client_id: forms.value.login.clientId,
      client_secret: forms.value.login.password
    });
    toast.add({severity: 'success', summary: 'Logged in', detail: 'Successfully logged in!', life: 5000});
    router.push("/");
  } catch (err) {
    toast.add({severity: 'error', summary: 'Login failed', detail: 'Unsuccessful login attempt', life: 10000});
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
              Welcome to the TSG Wallet UI
            </div>
            <span class="text-600 font-medium" v-if="currentForm === 'login'">Sign in to continue</span>
            <span class="text-600 font-medium" v-else-if="currentForm === 'registration'">Register a new client</span>
            <span class="text-600 font-medium" v-else-if="currentForm === 'reset'">Reset password</span>
            <span class="text-600 font-medium" v-else-if="currentForm === 'change'">Change password</span>
          </div>
          <div v-if="currentForm === 'login'">
            <form ref="loginForm" @submit.prevent="login">
              <div class="field">
                <label
                  for="clientId"
                  class="block text-900 text-xl font-medium mb-2"
                  >Email / Client ID</label
                >
                <InputText
                  id="clientId"
                  type="text"
                  placeholder="Email / Client ID"
                  class="w-full md:w-30rem mb-5"
                  style="padding: 1rem"
                  required
                  v-model="forms.login.clientId"
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
                  v-model="forms.login.password"
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
              <div class="field">
                <Button
                  label="Register"
                  class="w-full p-3 mb-3 text-xl"
                  severity="success"
                  @click="currentForm = 'registration'"
                ></Button>
              </div>
              <div class="field">
                <Button
                  label="Forgot password?"
                  class="w-full p-3 text-xl"
                  severity="warning"
                  @click="currentForm = 'reset'"
                ></Button>
                </div> 
            </form>
          </div>
          <div v-else-if="currentForm === 'registration'">
            <form ref="registerForm">
              <div class="field">
                <label
                  for="email"
                  class="block text-900 text-xl font-medium mb-2"
                >Email</label>
                <InputText
                  id="email"
                  type="text"
                  placeholder="Email"
                  class="w-full md:w-30rem mb-5"
                  style="padding: 1rem"
                  required
                  v-model="forms.register.clientId"
                />
              </div>
              <div class="field">
                <label
                  for="password"
                  class="block text-900 text-xl font-medium mb-2"
                >Password</label>
                <Password
                  id="password"
                  v-model="forms.register.password"
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
                <label
                  for="didId"
                  class="block text-900 text-xl font-medium mb-2"
                >Email</label>
                <InputText
                  id="didId"
                  type="text"
                  placeholder="did:web:..."
                  class="w-full md:w-30rem mb-5"
                  style="padding: 1rem"
                  required
                  pattern="did:web:.*"
                  validation-message="DID ID must be a DID web identifier"
                  v-model="forms.register.didId"
                />
              </div>
              <div class="field">
                <Button
                  label="Register"
                  type="submit"
                  class="w-full p-3 mb-3 text-xl"
                ></Button>
              </div>
              <div class="field">
                <Button
                  label="Back"
                  class="w-full p-3 mb-3 text-xl"
                  severity="warning"
                  @click="currentForm = 'login'"
                ></Button>
              </div>
            </form>
          </div>
          <div v-else-if="currentForm === 'reset'">
            <form ref="forgotPasswordForm">
              <div class="field">
                <label
                  for="email"
                  class="block text-900 text-xl font-medium mb-2"
                >Email</label>
                <InputText
                  id="email"
                  type="text"
                  placeholder="Email"
                  class="w-full md:w-30rem mb-5"
                  style="padding: 1rem"
                  required
                  v-model="forms.reset.email"
                />
              </div>
              <div class="field">
                <Button
                  label="Reset password"
                  type="submit"
                  class="w-full p-3 mb-3 text-xl"
                ></Button>
              </div>
              <div class="field">
                <Button
                  label="Back"
                  class="w-full p-3 mb-3 text-xl"
                  severity="warning"
                  @click="currentForm = 'login'"
                ></Button>
              </div>
            </form>
          </div>
          <div v-else-if="currentForm === 'change'">
            <form ref="resetPasswordForm">
              <div class="field">
                <label
                  for="password"
                  class="block text-900 text-xl font-medium mb-2"
                >Password</label>
                <Password
                  id="password"
                  v-model="forms.register.password"
                  placeholder="Password"
                  :toggleMask="true"
                  :feedback="false"
                  autocomplete="new-password"
                  class="w-full mb-3"
                  inputClass="w-full"
                  required
                  :inputStyle="{ padding: '1rem' }"
                ></Password>
              </div>
              <div class="field">
                <Button
                  label="Change password"
                  type="submit"
                  class="w-full p-3 mb-3 text-xl"
                ></Button>
              </div>
              <div class="field">
                <Button
                  label="Back"
                  class="w-full p-3 mb-3 text-xl"
                  severity="warning"
                  @click="currentForm = 'login'"
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
