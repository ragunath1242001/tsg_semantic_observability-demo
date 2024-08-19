import { createApp } from "vue";
import App from "./App.vue";
import Lara from "@primevue/themes/lara";
import http from "./utils/http";
import { AxiosKey } from "./utils/symbols";
import router from "./router";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Accordion from "primevue/accordion";
import Badge from "primevue/badge";
import BadgeDirective from "primevue/badgedirective";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import ConfirmationService from "primevue/confirmationservice";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import Tree from "primevue/tree";
import ToggleSwitch from "primevue/toggleswitch";
import Tag from "primevue/tag";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import CatalogVue from "./components/Catalog.vue";
import AppConfigVue from "./layout/AppConfig.vue";
import Password from "primevue/password";
import Panel from "primevue/panel";
import SelectButton from "primevue/selectbutton";
import Skeleton from "primevue/skeleton";
import Textarea from "primevue/textarea";
import Timeline from "primevue/timeline";
import ProgressSpinner from "primevue/progressspinner";
import MonacoEditorVue from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { loader } from "@guolao/vue-monaco-editor";
import Divider from "primevue/divider";
import "@tsg-dsp/common-ui/assets/styles.scss";
import "@tsg-dsp/common-ui/assets/tailwind.css";
import MultiSelect from "primevue/multiselect";
import Tooltip from "primevue/tooltip";
import Tabs from "primevue/tabs";
import TabPanel from "primevue/tabpanel";
import Drawer from "primevue/drawer";
import FloatLabel from "primevue/floatlabel";
import TabList from "primevue/tablist";
import TabPanels from "primevue/tabpanels";
import Tab from "primevue/tab";
import AccordionPanel from "primevue/accordionpanel";
import AccordionContent from "primevue/accordioncontent";
import AccordionHeader from "primevue/accordionheader";

const pinia = createPinia();
const app = createApp(App);
app.provide(AxiosKey, http);
app.use(pinia);
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: ".app-dark",
    },
  },
});
app.use(ConfirmationService);
app.use(ToastService);

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/dev/vs",
  },
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
app.component("Column", Column);
app.component("ConfirmDialog", ConfirmDialog);
app.component("DataTable", DataTable);
app.component("DataView", DataView);
app.component("Dialog", Dialog);
app.component("Divider", Divider);
app.component("Drawer", Drawer);
app.component("FloatLabel", FloatLabel);
app.component("InputText", InputText);
app.component("MonacoEditorVue", MonacoEditorVue);
app.component("MultiSelect", MultiSelect);
app.component("Panel", Panel);
app.component("Password", Password);
app.component("ProgressSpinner", ProgressSpinner);
app.component("SelectButton", SelectButton);
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
