<template>
  <div id="app">
    <b-navbar :mobile-burger="false" :shadow="true">
      <template #brand>
        <b-navbar-item tag="router-link" :to="'/'">
            TSG Wallet UI
        </b-navbar-item>
        </template>
        <template #end  v-if="client_info">
            <b-navbar-item tag="div">
              {{ client_info.sub }}
              <small class="ml-2"><code>{{ client_info.didId }}</code></small>

            </b-navbar-item>
            <b-navbar-item tag="div">
              <div class="buttons">
                    <a class="button is-light" @click="logout">
                        Log out
                    </a>
                </div>
            </b-navbar-item>
        </template>
    </b-navbar>

    <section class="main-content columns is-fullheight">
      <aside class="column is-2 p-5">
        <b-menu>
          <b-menu-list label="Navigation">
            <b-menu-item tag="router-link" icon="card-account-details-outline" to="/" label="DID"></b-menu-item>
            <template v-if="client_info">
              <b-menu-item tag="router-link" v-if="client_info.roles.includes('manage_keys')" icon="key" to="/keys" label="Keys"></b-menu-item>
              <b-menu-item tag="router-link" v-if="client_info.roles.includes('view_own_credentials') || client_info.roles.includes('view_all_credentials')" icon="email-seal-outline" to="/credentials" label="Credentials"></b-menu-item>
              <b-menu-item tag="router-link" v-if="client_info.roles.includes('manage_clients')" icon="account-multiple" to="/clients" label="Clients"></b-menu-item>
            </template>
          </b-menu-list>
        </b-menu>
      </aside>

      <div class="container column is-10">
        <router-view v-if="client_info" />
        <login v-else />
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <div class="content has-text-centered">
          <p>&copy; 2023 - TNO TSG</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import store from './store'
import Login from './components/Login.vue'

import '@mdi/font/css/materialdesignicons.css'

export default Vue.extend({
  name: 'App',
  components: {
    Login
  },
  computed: {
    ...mapState(['client_info'])
  },
  methods: {
    async logout() {
      console.log('Logout');
      await store.dispatch('logout')
      this.$router.go(0)
    }
  }
})
</script>

<style lang="scss">
$navbar-breakpoint: 0;

@import "bulma/sass/utilities/_all.sass";

$menu-label-color: $light;
$menu-item-color: $white;



@import "~bulma/bulma";
@import "~buefy/src/scss/buefy";

#app {
  min-height: 100%;
}

aside {
  background: $grey-dark;
  min-height: calc( 100vh - 3.25rem - 11rem );
}


.footer {
  margin-top: -12px;
}

.card {
  margin-bottom: 2rem;
}

.main-content {
  margin-top: 0;
}
</style>
