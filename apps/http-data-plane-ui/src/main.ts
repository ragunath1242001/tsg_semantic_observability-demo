import { createApp } from "vue";
import App from "./App.vue";
import { store } from "./store/index.js";
import router from "./router/index.js";

import PrimeVue from "primevue/config";
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Chips from "primevue/chips";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import DynamicDialog from "primevue/dynamicdialog";
import DialogService from "primevue/dialogservice";
import InputSwitch from "primevue/inputswitch";
import InputNumber from "primevue/inputtext";
import InputText from "primevue/inputtext";
import Inplace from "primevue/inplace";
import MultiSelect from "primevue/multiselect";
import SelectButton from "primevue/selectbutton";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import Tree from "primevue/tree";
import ToggleButton from "primevue/togglebutton";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Password from "primevue/password";
import ConfirmationService from "primevue/confirmationservice";
import Panel from "primevue/panel";
import MonacoEditorVue from "@libs/common-ui/components/MonacoEditor.vue";

import Tooltip from "primevue/tooltip";

import "@libs/common-ui/assets/styles.scss";

import { loader } from "@guolao/vue-monaco-editor";

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/dev/vs",
  },
});

const app = createApp(App);
app.use(store);
app.use(router);
app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(ConfirmationService);
app.use(DialogService);

app.directive("tooltip", Tooltip);

app.component("AutoComplete", AutoComplete);
app.component("Button", Button);
app.component("Chips", Chips);
app.component("ConfirmDialog", ConfirmDialog);
app.component("Dialog", Dialog);
app.component("Dropdown", Dropdown);
app.component("DynamicDialog", DynamicDialog);
app.component("Card", Card);
app.component("Column", Column);
app.component("DataTable", DataTable);
app.component("MultiSelect", MultiSelect);
app.component("SelectButton", SelectButton);
app.component("InputSwitch", InputSwitch);
app.component("InputNumber", InputNumber);
app.component("InputText", InputText);
app.component("Inplace", Inplace);
app.component("Password", Password);
app.component("TabView", TabView);
app.component("TabPanel", TabPanel);
app.component("Tag", Tag);
app.component("Textarea", Textarea);
app.component("Toast", Toast);
app.component("ToggleButton", ToggleButton);
app.component("Tree", Tree);
app.component("Panel", Panel);

app.component("MonacoEditorVue", MonacoEditorVue);

app.mount("#app");
