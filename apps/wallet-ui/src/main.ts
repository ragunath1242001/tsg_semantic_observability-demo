import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";
import Lara from "@primevue/themes/lara";

import PrimeVue from "primevue/config";
import AutoComplete from "primevue/autocomplete";
import Badge from "primevue/badge";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import FileUpload from "primevue/fileupload";
import InputNumber from "primevue/inputtext";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Message from "primevue/message";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import Tree from "primevue/tree";
import ToggleSwitch from "primevue/toggleswitch";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Password from "primevue/password";
import ConfirmationService from "primevue/confirmationservice";
import Panel from "primevue/panel";
import SelectButton from "primevue/selectbutton";
import MonacoEditorVue from "@tsg-dsp/common-ui/components/MonacoEditor.vue";

import "@tsg-dsp/common-ui/assets/styles.scss";
import "@tsg-dsp/common-ui/assets/tailwind.css";
import { createPinia } from "pinia";

import { loader } from "@guolao/vue-monaco-editor";
import Drawer from "primevue/drawer";
import { setJsonLdDebugContexts } from "@tsg-dsp/common-dsp";

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
app.component("ConfirmDialog", ConfirmDialog);
app.component("Dialog", Dialog);
app.component("Drawer", Drawer);
app.component("Select", Select);
app.component("FileUpload", FileUpload);
app.component("Card", Card);
app.component("Column", Column);
app.component("DataTable", DataTable);
app.component("MultiSelect", MultiSelect);
app.component("Message", Message);
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
app.component("MonacoEditorVue", MonacoEditorVue);

app.mount("#app");
