import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";

import PrimeVue from "primevue/config";
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Chips from "primevue/chips";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputSwitch from "primevue/inputswitch";
import InputNumber from "primevue/inputtext";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Message from "primevue/message";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import Tree from "primevue/tree";
import ToggleButton from "primevue/togglebutton";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Password from "primevue/password";
import ConfirmationService from "primevue/confirmationservice";
import Panel from "primevue/panel";
import SelectButton from "primevue/selectbutton";
import MonacoEditorVue from "./components/MonacoEditor.vue";

import "@/assets/styles.scss";
import { store } from "./store/index.js";

import { loader } from "@guolao/vue-monaco-editor";
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/dev/vs",
  },
});

const app = createApp(App);
app.use(router);
app.use(store);
app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(ConfirmationService);

app.component("AutoComplete", AutoComplete);
app.component("Button", Button);
app.component("Chips", Chips);
app.component("ConfirmDialog", ConfirmDialog);
app.component("Dialog", Dialog);
app.component("Dropdown", Dropdown);
app.component("Card", Card);
app.component("Column", Column);
app.component("DataTable", DataTable);
app.component("MultiSelect", MultiSelect);
app.component("Message", Message);
app.component("InputSwitch", InputSwitch);
app.component("InputNumber", InputNumber);
app.component("InputText", InputText);
app.component("Password", Password);
app.component("Tag", Tag);
app.component("Textarea", Textarea);
app.component("Toast", Toast);
app.component("ToggleButton", ToggleButton);
app.component("Tree", Tree);
app.component("Panel", Panel);
app.component("SelectButton", SelectButton);
app.component("MonacoEditorVue", MonacoEditorVue);

app.mount("#app");
