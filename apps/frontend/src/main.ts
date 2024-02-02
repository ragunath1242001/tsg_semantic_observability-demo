import { createApp } from 'vue'
import App from './App.vue'
import http from './utils/http'
import { AxiosKey } from './utils/symbols'
import router from './router'

import PrimeVue from 'primevue/config';
import Button from 'primevue/button';
import InputSwitch from 'primevue/inputswitch';
import InputText from 'primevue/inputtext';
import Toast from 'primevue/toast';
import ToastService from 'primevue/toastservice';
import Tree from 'primevue/tree';
import '@/assets/styles.scss'
import ToggleButton from 'primevue/togglebutton';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import CatalogVue from './components/Catalog.vue'


const app = createApp(App);
app.provide(AxiosKey, http);
app.use(router);
app.use(PrimeVue, { ripple: true });
app.use(ToastService);


app.component('Button', Button);
app.component('Card', Card);
app.component('CatalogVue', CatalogVue);
app.component('Column', Column)
app.component('DataTable', DataTable);
app.component('InputSwitch', InputSwitch);
app.component('InputText', InputText);
app.component('Tag', Tag);
app.component('Toast', Toast);
app.component('ToggleButton', ToggleButton);
app.component('Tree', Tree);

app.mount('#app');
