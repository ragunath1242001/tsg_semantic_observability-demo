<script setup lang="ts">
const pairs = defineModel<{ key: string; value: string }[]>();

const onCellEditComplete = (event) => {
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
    editMode="cell"
    @cell-edit-complete="onCellEditComplete"
  >
    <Column
      field="key"
      header="Key"
      style="
        width: 35%;
        max-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      "
    >
      <template #body="props">
        <div
          style="width: 100%"
          class="white-space-nowrap overflow-hidden text-overflow-ellipsis"
        >
          <span class="text-color-secondary" v-if="props.data.key.trim() === ''"
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
      "
    >
      <template #body="props">
        <div
          style="width: 100%"
          class="white-space-nowrap overflow-hidden text-overflow-ellipsis"
        >
          <span
            class="text-color-secondary"
            v-if="props.data.value.trim() === ''"
            >Value</span
          >
          <span v-else>{{ props.data.value }}</span>
        </div>
      </template>
      <template #editor="props">
        <InputText v-model="props.data.value" autofocus class="w-full" />
      </template>
    </Column>
    <Column style="width: 10%">
      <template #body="props">
        <Button
          v-if="props.index < pairs.length"
          size="small"
          icon="pi pi-times"
          @click="pairs.splice(props.index, 1)"
          severity="danger"
          aria-label="Stop"
          outlined
        />
        <span v-else></span>
      </template>
    </Column>
  </DataTable>
</template>
