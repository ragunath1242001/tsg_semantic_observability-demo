<template>
  <div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Keys</p>
      </div>
      <div class="card-content">
        <p>The current keys registered for this Wallet instance:</p>
        <b-table :data="clients">
            <b-table-column field="clientId" label="ClientID" v-slot="props">
              <code>{{ props.row.clientId }}</code>
            </b-table-column>
            <b-table-column field="didId" label="DID ID" v-slot="props">
              <code>{{ props.row.didId }}</code>
            </b-table-column>
            <b-table-column field="roles" label="Roles" v-slot="props">
              <b-taginput
                style="max-width: 25rem;"
                v-model="props.row.roles"
                :data="roles"
                autocomplete
                :open-on-focus="true"
                @add="addRole(props.row.clientId, $event)"
                @remove="removeRole(props.row.clientId, $event)"
                >

              </b-taginput>
            </b-table-column>
            <b-table-column field="verified" label="Verified" v-slot="props">
              <div class="buttons">
                <b-button :disabled="props.row.clientId === currentClient" v-if="props.row.verified" type="is-success" icon-right="check-bold" @click="deactivate(props.row.clientId)">Verified</b-button>
                <b-button :disabled="props.row.clientId === currentClient" v-else type="is-danger" icon-right="close-thick" @click="activate(props.row.clientId)">Unverified</b-button>
                <b-button :disabled="props.row.clientId === currentClient" type="is-danger" @click="removeClient(props.row.clientId)">Delete</b-button>
              </div>
            </b-table-column>
        </b-table>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Add client</p>
      </div>
      <div class="card-content">
        <form id="addClient" @submit.prevent="addClient">

          <b-field
            label="Email / client ID"
            label-for="email"
          >
            <b-input
              id="email"
              key="register-email"
              v-model="addClientForm.email"
              placeholder="Email"
              type="email"
              icon-left="account"
              autocomplete="username"
              required
              @keyup.native.enter="addClient"
            />
          </b-field>
          <b-field
            label="Password / client secret"
            label-for="new-password"
          >
            <b-input
              id="new-password"
              key="register-password"
              v-model="addClientForm.secret"
              placeholder="*******"
              type="password"
              icon-left="lock"
              autocomplete="new-password"
              name="new-password"
              required
              @keyup.native.enter="addClient"
            />
          </b-field>
          <b-field
            label="DID ID"
            label-for="didId"
          >
            <b-input
              id="didId"
              key="register-didId"
              v-model="addClientForm.didId"
              placeholder="DID ID"
              type="text"
              icon-left="card-account-details"
              pattern='did:web:.*'
              validation-message="DID must be a DID web"
              required
              @keyup.native.enter="addClient"
            />
          </b-field>
          <b-field horizontal>
            <b-button type="is-primary" @click="addClient">Add key</b-button>
          </b-field>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import store, { axiosInstance } from '@/store';
import Vue from 'vue';
import CodeHighlight from '../components/CodeHighlight.vue';
import { AppRole, Clients } from '@/model/clients';

export default Vue.extend({
  name: 'KeysView',
  components: {
    CodeHighlight
  },
  data(): {
    clients: Clients[] | undefined,
    roles: string[],
    currentClient: string | undefined,
    addClientForm: {
      email: string,
      secret: string,
      didId: string
    }
  } {
    return {
      clients: undefined,
      roles: Object.values(AppRole),
      currentClient: store.state.client_info?.sub,
      addClientForm: {
        email: '',
        secret: '',
        didId: ''
      }
    }
  },
  async created() {
    await this.loadClients();
  },
  methods: {
    async loadClients() {
      try {
        const response = await axiosInstance<Clients[]>('management/clients');
        this.clients = response.data;
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in loading clients',
          type: 'is-danger'
        });
      }
    },
    async removeRole(clientId: string, role: string) {
      try {
        await axiosInstance.delete(`management/clients/${encodeURIComponent(clientId)}/roles/${encodeURIComponent(role)}`);
        await this.loadClients();
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in removing role',
          type: 'is-danger'
        });
      }
    },
    async addRole(clientId: string, role: string) {
      try {
        await axiosInstance.put(`management/clients/${encodeURIComponent(clientId)}/roles/${encodeURIComponent(role)}`);
        await this.loadClients();
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in adding role',
          type: 'is-danger'
        });
      }
    },
    async activate(clientId: string) {
      try {
        await axiosInstance.put(`management/clients/${encodeURIComponent(clientId)}/activate`);
        await this.loadClients();
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in activating client',
          type: 'is-danger'
        });
      }
    },
    async deactivate(clientId: string) {
      if (clientId === store.state.client_info?.sub) {
        this.$buefy.toast.open({
          message: 'Cannot deactivate current client',
          type: 'is-danger'
        });
        return;
      }
      try {
        await axiosInstance.put(`management/clients/${encodeURIComponent(clientId)}/deactivate`);
        await this.loadClients();
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in deactivating',
          type: 'is-danger'
        });
      }
    },
    async addClient() {
      if (!this.getFormElement('addClient').checkValidity()){
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
      try {
        await axiosInstance.post('management/clients', this.addClientForm);
        await this.loadClients();
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in adding new client',
          type: 'is-danger'
        });
      }
    },
    async removeClient(clientId: string) {
      if (clientId === store.state.client_info?.sub) {
        this.$buefy.toast.open({
          message: 'Cannot delete current client',
          type: 'is-danger'
        });
        return;
      }
      this.$buefy.dialog.confirm({
        message: 'Are you sure you want to delete this client?',
        onConfirm: async () => {
          try {
            await axiosInstance.delete(`management/clients/${encodeURIComponent(clientId)}`);
            await this.loadClients();
          } catch (err) {
            this.$buefy.toast.open({
              message: 'Error in activating client',
              type: 'is-danger'
            });
          }
        }
      })
    },
    getFormElement(id: string) {
      return document.getElementById(id) as HTMLFormElement
    }
  }
});
</script>
