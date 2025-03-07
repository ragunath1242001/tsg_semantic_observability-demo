import "@tsg-dsp/common-ui/assets/styles.scss";
import "@tsg-dsp/common-ui/assets/tailwind.css";

import { loader } from "@guolao/vue-monaco-editor";
import Lara from "@primevue/themes/lara";
import { setJsonLdDebugContexts } from "@tsg-dsp/common-dsp";
import MonacoEditorVue from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import http from "@tsg-dsp/common-ui/utils/http";
import { createPinia } from "pinia";
import { ColorPicker, FileUpload, Select } from "primevue";
import Accordion from "primevue/accordion";
import AccordionContent from "primevue/accordioncontent";
import AccordionHeader from "primevue/accordionheader";
import AccordionPanel from "primevue/accordionpanel";
import Badge from "primevue/badge";
import BadgeDirective from "primevue/badgedirective";
import Button from "primevue/button";
import Card from "primevue/card";
import Chart from "primevue/chart";
import Column from "primevue/column";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Divider from "primevue/divider";
import Drawer from "primevue/drawer";
import FloatLabel from "primevue/floatlabel";
import InputText from "primevue/inputtext";
import MeterGroup from "primevue/metergroup";
import MultiSelect from "primevue/multiselect";
import Panel from "primevue/panel";
import Password from "primevue/password";
import ProgressSpinner from "primevue/progressspinner";
import SelectButton from "primevue/selectbutton";
import Skeleton from "primevue/skeleton";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import Timeline from "primevue/timeline";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import ToggleSwitch from "primevue/toggleswitch";
import Tooltip from "primevue/tooltip";
import Tree from "primevue/tree";
import { createApp } from "vue";

import App from "./App.vue";
import CatalogVue from "./components/Catalog.vue";
import AppConfigVue from "./layout/AppConfig.vue";
import router from "./router";
import { AxiosKey } from "./utils/symbols";

setJsonLdDebugContexts(
  import.meta.env.TSG_STATIC_MODE !== "production",
  import.meta.env.TSG_STATIC_VERSION
);

const pinia = createPinia();
const app = createApp(App);
app.provide(AxiosKey, http);
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
app.use(ConfirmationService);
app.use(ToastService);

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/dev/vs"
  }
});
app.component("Accordion", Accordion);
app.component("AccordionContent", AccordionContent);
app.component("AccordionHeader", AccordionHeader);
app.component("AccordionPanel", AccordionPanel);
app.component("AppConfig", AppConfigVue);
app.component("Badge", Badge);
app.component("Button", Button);
app.component("Card", Card);
app.component("CatalogVue", CatalogVue);
app.component("Chart", Chart);
app.component("ColorPicker", ColorPicker);
app.component("Column", Column);
app.component("ConfirmDialog", ConfirmDialog);
app.component("DataTable", DataTable);
app.component("DataView", DataView);
app.component("Dialog", Dialog);
app.component("Divider", Divider);
app.component("Drawer", Drawer);
app.component("FileUpload", FileUpload);
app.component("FloatLabel", FloatLabel);
app.component("InputText", InputText);
app.component("MeterGroup", MeterGroup);
app.component("MonacoEditorVue", MonacoEditorVue);
app.component("MultiSelect", MultiSelect);
app.component("Panel", Panel);
app.component("Password", Password);
app.component("ProgressSpinner", ProgressSpinner);
app.component("SelectButton", SelectButton);
app.component("Select", Select);
app.component("Skeleton", Skeleton);
app.component("Tag", Tag);
app.component("Textarea", Textarea);
app.component("Timeline", Timeline);
app.component("Toast", Toast);
app.component("ToggleSwitch", ToggleSwitch);
app.component("Tree", Tree);
app.component("Tab", Tab);
app.component("Tabs", Tabs);
app.component("TabList", TabList);
app.component("TabPanel", TabPanel);
app.component("TabPanels", TabPanels);

app.directive("badge", BadgeDirective);
app.directive("tooltip", Tooltip);

app.mount("#app");
