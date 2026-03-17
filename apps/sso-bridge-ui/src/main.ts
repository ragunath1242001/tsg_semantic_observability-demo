import "@tsg-dsp/common-ui/assets/styles.scss";
import "@tsg-dsp/common-ui/assets/tailwind.css";

import Lara from "@primeuix/themes/lara";
import { createPinia } from "pinia";
import {
  Badge,
  Button,
  Checkbox,
  Column,
  DataTable,
  Dialog,
  Inplace,
  InputChips,
  InputText,
  MultiSelect,
  Password,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Textarea,
  Toolbar
} from "primevue";
import Card from "primevue/card";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import DataView from "primevue/dataview";
import DynamicDialog from "primevue/dynamicdialog";
import Fieldset from "primevue/fieldset";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Message from "primevue/message";
import Panel from "primevue/panel";
import RadioButton from "primevue/radiobutton";
import SelectButton from "primevue/selectbutton";
import Skeleton from "primevue/skeleton";
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
app.component("Badge", Badge);
app.component("Button", Button);
app.component("Card", Card);
app.component("Checkbox", Checkbox);
app.component("Column", Column);
app.component("ConfirmDialog", ConfirmDialog);
app.component("DataTable", DataTable);
app.component("DataView", DataView);
app.component("Dialog", Dialog);
app.component("DynamicDialog", DynamicDialog);
app.component("Fieldset", Fieldset);
app.component("IconField", IconField);
app.component("Inplace", Inplace);
app.component("InputChips", InputChips);
app.component("InputIcon", InputIcon);
app.component("InputText", InputText);
app.component("Message", Message);
app.component("MultiSelect", MultiSelect);
app.component("Panel", Panel);
app.component("Password", Password);
app.component("RadioButton", RadioButton);
app.component("Select", Select);
app.component("SelectButton", SelectButton);
app.component("Skeleton", Skeleton);
app.component("Tab", Tab);
app.component("Tabs", Tabs);
app.component("TabList", TabList);
app.component("TabPanel", TabPanel);
app.component("TabPanels", TabPanels);
app.component("Tag", Tag);
app.component("Textarea", Textarea);
app.component("Toast", Toast);
app.component("Toolbar", Toolbar);

app.mount("#app");
