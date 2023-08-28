<template>
  <div class="login-form">
    <div 
      v-if="!registration && !resetRequest && !change && !resetCode"
    >
      <h3 class="title">
        Login
      </h3>
      <form
        id="login"
        @submit.prevent="login"
      >
        <b-field
          label="Email / Client ID"
          label-for="email"
        >
          <b-input
            id="email"
            key="login-email"
            v-model="forms.login.clientId"
            placeholder="Email / Client ID"
            type="text"
            icon-left="account"
            autocomplete="username"
            name="text"
            required
            @keyup.native.enter="login"
          />
        </b-field>
        <b-field
          label="Password"
          label-for="current-password"
        >
          <b-input
            id="current-password"
            key="login-password"
            v-model="forms.login.password"
            placeholder="**************"
            type="password"
            icon-left="lock"
            autocomplete="current-password"
            name="current-password"
            required
            @keyup.native.enter="login"
          />
        </b-field>
        <b-field>
          <b-button
            type="is-success"
            @click="login"
          >
            Login
          </b-button>
        </b-field>
        <b-field>
          <b-button
            type="is-link"
            @click="registration = true"
          >
            Register
          </b-button>
        </b-field>
        <b-field>
          <b-button
            type="is-text"
            @click="resetRequest = true"
          >
            Forgot password?
          </b-button>
        </b-field>
      </form>
    </div>
    <div v-if="registration">
      <h3 class="title">
        Register
      </h3>
      <form
        id="register"
        @submit.prevent="register"
      >
        <div>
          <b-field
            label="Email / Client ID"
            label-for="email"
          >
            <b-input
              id="email"
              key="register-email"
              v-model="forms.register.clientId"
              placeholder="Email"
              type="email"
              icon-left="account"
              autocomplete="username"
              required
              @keyup.native.enter="register"
            />
          </b-field>
          <b-field
            label="Password / Secret"
            label-for="new-password"
          >
            <b-input
              id="new-password"
              key="register-password"
              v-model="forms.register.password"
              placeholder="*******"
              type="password"
              icon-left="lock"
              autocomplete="new-password"
              name="new-password"
              required
              @keyup.native.enter="register"
            />
          </b-field>
          <b-field
            label="DID ID"
            label-for="didId"
            message=""
          >
            <b-input
              id="didId"
              key="register-didId"
              v-model="forms.register.didId"
              placeholder="did:web:"
              type="text"
              icon-left="user"
              pattern="did:web:.*"
              validation-message="DID ID must be a DID web identifier"
              name="didId"
              required
              @keyup.native.enter="register"
            />
            <p class="help is-info"> The DID identifier belonging to this client, can be the local DID for this Wallet instance (for management of this wallet) or a separate DID (for receiving credentials from this wallet)</p>
          </b-field>
          <b-field>
            <b-button
              type="is-success"
              @click="register"
            >
              Register
            </b-button>
          </b-field>
          <b-field>
            <b-button
              type="is-success"
              @click="registration = false"
            >
              Back
            </b-button>
          </b-field>
        </div>
      </form>
    </div>
    <div v-if="resetRequest">
      <h3 class="title">
        Forgot password?
      </h3>
      <form
        id="forgotPassword"
        @submit.prevent="forgotPassword"
      >
        <b-field label="Email">
          <b-input
            key="forgot-email"
            v-model="forms.reset.email"
            placeholder="Email / Client ID"
            type="text"
            icon-left="account"
            required
            @keyup.native.enter="forgotPassword"
          />
        </b-field>
        <b-field>
          <b-button
            type="is-success"
            @click="forgotPassword"
          >
            Reset password
          </b-button>
        </b-field>
        <b-field>
          <b-button
            type="is-success"
            @click="resetRequest = false"
          >
            Back
          </b-button>
        </b-field>
      </form>
    </div>
    <div v-if="resetCode">
      <h3 class="title">
        Reset password
      </h3>
      <form
        id="resetPassword"
        @submit.prevent="resetPassword"
      >
        <input
          id="email"
          type="hidden"
          name="email"
          :value="resetClient"
        >
        <b-field
          label="New Password"
          label-for="new-password"
        >
          <b-input
            id="new-password"
            key="reset-password"
            v-model="forms.change.password"
            placeholder="*******"
            type="password"
            icon-left="lock"
            autocomplete="new-password"
            name="new-password"
            password-reveal="true"
            @keyup.native.enter="resetPassword"
          />
        </b-field>
        <b-field>
          <b-button
            type="is-success"
            @click="resetPassword"
          >
            Change password
          </b-button>
        </b-field>
        <b-field>
          <b-button
            type="is-success"
            @click="resetCode = null"
          >
            Back
          </b-button>
        </b-field>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import qs from "qs";
import store, { axiosInstance } from '@/store';

export default Vue.extend({
  data() {
    return {
      registration: false,
      resetRequest: false,
      change: false,
      resetCode: null as string | null,
      resetClient: null as string | null,
      forms: {
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
      },

    }
  },
  async mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('action') && urlParams.get('action') === 'verify') {
      try {
        await axiosInstance.post(`auth/verify?clientId=${encodeURIComponent(urlParams.get('clientId') || '-')}&code=${encodeURIComponent(urlParams.get('code') || '-')}`)
        this.$router.push({path: '/'});
        this.$buefy.toast.open({
          message: 'Email address verified, you can now login',
          type: 'is-success',
          duration: 5000,
          position: 'is-top'
        })
      } catch (e) {
        this.$buefy.toast.open({
          message: 'Cannot verify account',
          type: 'is-danger',
        });
      }
    }
    if (urlParams.has('forgot') && urlParams.has('clientId')) {
      this.resetCode = urlParams.get('forgot');
      this.resetClient = urlParams.get('clientId');
    }
    if (urlParams.has('verified')) {
      this.$buefy.toast.open({
        message: 'Email address verified, you can now login',
        type: 'is-success',
        duration: 5000,
        position: 'is-top'
      })
    }
  },
  methods: {
    async login() {
      if (!this.getFormElement('login').checkValidity()) {
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
      try {
        await store.dispatch('login', {
          client_id: this.forms.login.clientId,
          client_secret: this.forms.login.password
        });
        this.$buefy.toast.open({
          message: 'Successfully logged in!',
          type: 'is-success',
        });
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Login failed!',
          duration: 10000,
          type: 'is-danger',
        });
      }

    },
    async register() {
      if (!this.getFormElement('register').checkValidity()) {
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
    },
    async forgotPassword() {
      if (!this.getFormElement('forgotpassword').checkValidity()) {
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
    },
    async resetPassword() {
      if (!this.getFormElement('resetPassword').checkValidity()) {
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
    },
    getFormElement(id: string) {
      return document.getElementById(id) as HTMLFormElement
    }
  },
})
</script>

<style lang="scss" #scoped>
.login-form {
  max-width: 40rem;
  margin: 5rem auto;
}
</style>