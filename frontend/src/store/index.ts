import { ClientInfo } from '@/model/clients';
import axios from 'axios'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

function parseAccessToken(jwt: string): ClientInfo {
  const [,payloadB64,] = jwt.split('.');
  const payload = atob(payloadB64);
  return JSON.parse(payload);
}

const store = new Vuex.Store({
  state: {
    access_token: null as string | null,
    refresh_token: localStorage.getItem('refresh_token'),
    client_info: null as ClientInfo | null
  },
  getters: {
  },
  mutations: {
    tokenUpdate (state, payload) {
      state.access_token = payload.access_token;
      state.refresh_token = payload.refresh_token;
      state.client_info = (payload.access_token) ? parseAccessToken(payload.access_token) : null;
    }
  },
  actions: {
    async login ({ commit }, payload) {
      const params = new URLSearchParams()
      params.append('client_id', payload.client_id)
      params.append('client_secret', payload.client_secret)
      try {
        const response = await axiosInstance.post('/auth/login', params);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        commit('tokenUpdate', response.data)
      } catch (e) {
        console.log(e)
        throw new Error('Login failed')
      }
    },
    async refresh ({ commit }) {
      if (!this.state.refresh_token) return;
      try {
        const response = await axiosInstance.get('/auth/refresh', {
          headers: {
            Authorization: `Bearer ${this.state.refresh_token}`
          }
        });
        localStorage.setItem('refresh_token', response.data.refresh_token);
        commit('tokenUpdate', response.data);
        return response.data.access_token;
      } catch (e) {
        console.log(e);
        localStorage.removeItem('refresh_token');
        commit('tokenUpdate', {
          access_token: null,
          refresh_token: null
        })
        return undefined;
      }
    },
    async logout ({ commit }) {
      localStorage.removeItem('refresh_token');
      commit('tokenUpdate', {
        access_token: null,
        refresh_token: null
      })
    }
  },
  modules: {
  }
});

export const axiosInstance = axios.create({
  baseURL: 'api/',
  timeout: 60000,
});
axiosInstance.interceptors.request.use(
  async config => {
    if (!config.headers.Authorization && store.state.access_token) {
      config.headers.Authorization = `Bearer ${store.state.access_token}`
    }
    return config;
  }
)
axiosInstance.interceptors.response.use(
  res => res,
  async (err) => {
    const originalConfig = err.config;
    if (err.response) {
      if (err.response.status === 401 
            && originalConfig?.headers['x-no-retry'] == null 
            && store.state.refresh_token
            && originalConfig.url !== '/auth/refresh'
        ) {
        originalConfig._retry = true;
        originalConfig.headers['x-no-retry'] = 'true'
        try {
          const access_token = await store.dispatch('refresh');
          if (access_token) {
            originalConfig.headers.Authorization = `Bearer ${store.state.access_token}`;
            return await axiosInstance(originalConfig);
          } else {
            return Promise.reject(err);
          }
          
        } catch (_error: any) {
          return Promise.reject(_error);
        }
      }
    }
    return Promise.reject(err);
  }
)

if (!store.state.access_token && store.state.refresh_token) {
  await store.dispatch('refresh');
}

export default store;
