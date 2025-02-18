<script setup lang="ts">
import { DataTableCellEditCompleteEvent } from "primevue";

const pairs = defineModel<{ key: string; value: string }[]>();

const onValueChange = (field: string, newValue: string) => {
  const pair = pairs.value.find((pair) => pair.key === field);
  if (pair) {
    pair.value = newValue;
  }
};

const onCellEditComplete = (event: DataTableCellEditCompleteEvent) => {
  let { data, newValue, field, index } = event;
  data[field] = newValue;
  if (index == pairs.value.length && (data.key != "" || data.value != "")) {
    pairs.value.push(data);
  }
};
</script>

<template>
  <DataTable
    :value="pairs.concat([{ key: '', value: '' }])"
    edit-mode="cell"
    @cell-edit-complete="onCellEditComplete">
    <Column
      field="key"
      header="Key"
      style="
        width: 35%;
        max-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">
      <template #body="props">
        <div
          style="width: 100%"
          class="whitespace-nowrap overflow-hidden text-ellipsis">
          <span v-if="props.data.key.trim() === ''" class="text-muted-color"
            >Key</span
          >
          <span v-else>{{ props.data.key }}</span>
        </div>
      </template>
      <template #editor="props">
        <InputText v-model="props.data.key" autofocus class="w-full" />
      </template>
    </Column>
    <Column
      field="value"
      header="Value"
      style="
        width: 55%;
        max-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">
      <template #body="props">
        <div
          style="width: 100%"
          class="whitespace-nowrap overflow-hidden text-ellipsis">
          <span v-if="props.data.value.trim() === ''" class="text-muted-color"
            >Value</span
          >
          <span v-else>{{ props.data.value }}</span>
        </div>
      </template>
      <template #editor="props">
        <InputText
          v-model="props.data.value"
          autofocus
          class="w-full"
          @value-change="
            (newValue) => onValueChange(props.data.key, newValue)
          " />
      </template>
    </Column>
    <Column style="width: 10%">
      <template #body="props">
        <Button
          v-if="props.index < pairs.length"
          size="small"
          icon="pi pi-times"
          severity="danger"
          aria-label="Stop"
          outlined
          @click="pairs.splice(props.index, 1)" />
        <span v-else></span>
      </template>
    </Column>
  </DataTable>
</template>
