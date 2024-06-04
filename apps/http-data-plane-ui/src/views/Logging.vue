<script setup lang="ts">
import PaginatedLogTable from "../components/PaginatedLogTable.vue"
</script>

<template>
  <Card>
    <template #title>Ingress logs</template>
    <template #subtitle>
      <p>All incoming requests from other data planes</p>
    </template>
    <template #content>
      <PaginatedLogTable type="ingress" />
    </template>
  </Card>
  <Card class="mt-5">
    <template #title>Egress logs</template>
    <template #subtitle>
      <p>All outgoing requests to other data planes</p>
      <p><strong><em>NOTE:</em></strong> Only requests proxied via the data plane will be visible here, direct requests
        cannot be logged</p>
    </template>
    <template #content>
      <PaginatedLogTable type="egress" />
    </template>
  </Card>
</template>