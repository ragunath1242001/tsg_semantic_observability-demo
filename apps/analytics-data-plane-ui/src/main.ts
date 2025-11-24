import "@tsg-dsp/common-ui/assets/tailwind.css";
import "@tsg-dsp/common-ui/assets/styles.scss";

import { loader } from "@guolao/vue-monaco-editor";
import Lara from "@primevue/themes/lara";
import { setJsonLdDebugContexts } from "@tsg-dsp/common-dsp";
import MonacoEditorVue from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { createPinia } from "pinia";
import {
  Chip,
  ColorPicker,
  DatePicker,
  DynamicDialog,
  Message,
  Skeleton
} from "primevue";
import Accordion from "primevue/accordion";
import AccordionContent from "primevue/accordioncontent";
import AccordionHeader from "primevue/accordionheader";
import AccordionPanel from "primevue/accordionpanel";
import AutoComplete from "primevue/autocomplete";
import Badge from "primevue/badge";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import DataTable from "primevue/datatable";
import DataView from "primevue/dataview";
import Dialog from "primevue/dialog";
import DialogService from "primevue/dialogservice";
import Divider from "primevue/divider";
import Drawer from "primevue/drawer";
import FileUpload from "primevue/fileupload";
import IconField from "primevue/iconfield";
import Inplace from "primevue/inplace";
import InputIcon from "primevue/inputicon";
import InputNumber from "primevue/inputtext";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Panel from "primevue/panel";
import Password from "primevue/password";
import ProgressBar from "primevue/progressbar";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Step from "primevue/step";
import StepList from "primevue/steplist";
import StepPanel from "primevue/steppanel";
import StepPanels from "primevue/steppanels";
import Stepper from "primevue/stepper";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import ToggleSwitch from "primevue/toggleswitch";
import Tooltip from "primevue/tooltip";
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
app.use(DialogService);

app.directive("tooltip", Tooltip);

app.component("AutoComplete", AutoComplete);
app.component("Badge", Badge);
app.component("Button", Button);
app.component("Chip", Chip);
app.component("ColorPicker", ColorPicker);
app.component("ConfirmDialog", ConfirmDialog);
app.component("Dialog", Dialog);
app.component("Drawer", Drawer);
app.component("Select", Select);
app.component("DynamicDialog", DynamicDialog);
app.component("Card", Card);
app.component("Checkbox", Checkbox);
app.component("Column", Column);
app.component("DataTable", DataTable);
app.component("DataView", DataView);
app.component("DatePicker", DatePicker);
app.component("FileUpload", FileUpload);
app.component("IconField", IconField);
app.component("InputIcon", InputIcon);
app.component("MultiSelect", MultiSelect);
app.component("SelectButton", SelectButton);
app.component("InputNumber", InputNumber);
app.component("InputText", InputText);
app.component("Inplace", Inplace);
app.component("Message", Message);
app.component("Panel", Panel);
app.component("Password", Password);
app.component("ProgressBar", ProgressBar);
app.component("Skeleton", Skeleton);
app.component("Step", Step);
app.component("Stepper", Stepper);
app.component("StepList", StepList);
app.component("StepPanel", StepPanel);
app.component("StepPanels", StepPanels);
app.component("Stepper", Stepper);
app.component("Tab", Tab);
app.component("Tabs", Tabs);
app.component("TabList", TabList);
app.component("TabPanel", TabPanel);
app.component("TabPanels", TabPanels);
app.component("Tag", Tag);
app.component("Textarea", Textarea);
app.component("Toast", Toast);
app.component("ToggleSwitch", ToggleSwitch);
app.component("Tree", Tree);
app.component("Accordion", Accordion);
app.component("AccordionPanel", AccordionPanel);
app.component("AccordionHeader", AccordionHeader);
app.component("AccordionContent", AccordionContent);
app.component("Divider", Divider);

app.component("MonacoEditorVue", MonacoEditorVue);

app.mount("#app");
