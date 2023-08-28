import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import Buefy from 'buefy';

// import hljs from 'highlight.js';
// import hljsVuePlugin from "@highlightjs/vue-plugin";


Vue.config.productionTip = false
 

Vue.use(Buefy);
// Vue.use(hljsVuePlugin as any);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
