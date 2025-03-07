import "@tsg-dsp/common-ui/assets/styles.scss";
import "@tsg-dsp/common-ui/assets/tailwind.css";

import Lara from "@primevue/themes/lara";
import { createPinia } from "pinia";
import {
  Button,
  Column,
  DataTable,
  Dialog,
  Inplace,
  InputText,
  MultiSelect,
  Password,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Toolbar
} from "primevue";
import Card from "primevue/card";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import DynamicDialog from "primevue/dynamicdialog";
import SelectButton from "primevue/selectbutton";
import StyleClass from "primevue/styleclass";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";
import http from "./utils/http";
import { AxiosKey } from "./utils/symbols";

const pinia = createPinia();
const app = createApp(App);
app.provide(AxiosKey, http);

app.directive("styleclass", StyleClass);

app.use(pinia);
app.use(router);
app.use(ConfirmationService);
app.use(ToastService);
app.use(PrimeVue, {
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: ".app-dark"
    }
  }
});
app.directive("tooltip", Tooltip);
app.component("Button", Button);
app.component("Card", Card);
app.component("Column", Column);
app.component("ConfirmDialog", ConfirmDialog);
app.component("DataTable", DataTable);
app.component("Dialog", Dialog);
app.component("DynamicDialog", DynamicDialog);
app.component("Inplace", Inplace);
app.component("InputText", InputText);
app.component("MultiSelect", MultiSelect);
app.component("Password", Password);
app.component("SelectButton", SelectButton);
app.component("Tab", Tab);
app.component("Tabs", Tabs);
app.component("TabList", TabList);
app.component("TabPanel", TabPanel);
app.component("TabPanels", TabPanels);
app.component("Toast", Toast);
app.component("Toolbar", Toolbar);

app.mount("#app");
