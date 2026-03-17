import "@tsg-dsp/common-ui/assets/styles.scss";
import "@tsg-dsp/common-ui/assets/tailwind.css";

import { loader } from "@guolao/vue-monaco-editor";
import Lara from "@primeuix/themes/lara";
import { setJsonLdDebugContexts } from "@tsg-dsp/common-dsp";
import MonacoEditorVue from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { createPinia } from "pinia";
import {
  Checkbox,
  ColorPicker,
  DynamicDialog,
  Inplace,
  TabList,
  TabPanels
} from "primevue";
import AutoComplete from "primevue/autocomplete";
import Badge from "primevue/badge";
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Drawer from "primevue/drawer";
import FileUpload from "primevue/fileupload";
import InputNumber from "primevue/inputtext";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import MeterGroup from "primevue/metergroup";
import MultiSelect from "primevue/multiselect";
import Panel from "primevue/panel";
import Password from "primevue/password";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Tab from "primevue/tab";
import TabPanel from "primevue/tabpanel";
import Tabs from "primevue/tabs";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import ToggleSwitch from "primevue/toggleswitch";
import Tree from "primevue/tree";
import { createApp } from "vue";

import App from "./App.vue";
import router from "./router/index.js";

setJsonLdDebugContexts(
  import.meta.env.TSG_STATIC_MODE !== "production",
  import.meta.env.TSG_STATIC_VERSION
);

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/dev/vs"
  }
});

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: ".app-dark"
    }
  }
});
app.use(ToastService);
app.use(ConfirmationService);

app.component("AutoComplete", AutoComplete);
app.component("Badge", Badge);
app.component("Button", Button);
app.component("Checkbox", Checkbox);
app.component("ColorPicker", ColorPicker);
app.component("ConfirmDialog", ConfirmDialog);
app.component("Dialog", Dialog);
app.component("DynamicDialog", DynamicDialog);
app.component("Drawer", Drawer);
app.component("Select", Select);
app.component("FileUpload", FileUpload);
app.component("Card", Card);
app.component("Column", Column);
app.component("DataTable", DataTable);
app.component("MeterGroup", MeterGroup);
app.component("MultiSelect", MultiSelect);
app.component("Message", Message);
app.component("Inplace", Inplace);
app.component("InputNumber", InputNumber);
app.component("InputText", InputText);
app.component("Password", Password);
app.component("Tag", Tag);
app.component("Textarea", Textarea);
app.component("Toast", Toast);
app.component("ToggleSwitch", ToggleSwitch);
app.component("Tree", Tree);
app.component("Panel", Panel);
app.component("SelectButton", SelectButton);
app.component("Tab", Tab);
app.component("Tabs", Tabs);
app.component("TabList", TabList);
app.component("TabPanel", TabPanel);
app.component("TabPanels", TabPanels);
app.component("MonacoEditorVue", MonacoEditorVue);

app.mount("#app");
