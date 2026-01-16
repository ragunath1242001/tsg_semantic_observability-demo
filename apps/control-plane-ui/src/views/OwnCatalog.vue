<script setup lang="ts">
import { storeToRefs } from "pinia";

import Catalog from "../components/Catalog.vue";
import { useDspStore } from "../stores/dsp";

const { ownCatalog } = storeToRefs(useDspStore());
</script>
<template>
  <div class="grid grid-cols-12 gap-8">
    <Card class="col-span-12">
      <template #title>Control Plane - Own Catalog</template>
      <template #content>
        <p>
          This page displays the Catalog that is available through your control
          plane. It shows the datasets that are part of your catalog.
        </p>
      </template>
    </Card>
    <Catalog
      v-if="ownCatalog.catalog"
      :catalog="ownCatalog.catalog"
      :single-catalog="true"
      :own-catalog="true"
      url=""
      assigner="" />
  </div>
</template>
