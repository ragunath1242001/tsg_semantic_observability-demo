<template>

  <b-field :label="schema.title || name" style="padding-left: 2rem;" :message="[schema.description]">
    <component :is="(schema.pattern) ? 'b-field' : 'div'">
    <template v-if="type === 'const'">
      <b-input v-model="value" disabled></b-input>
    </template>
    <template v-else-if="type === 'enum'">
      <b-select :placeholder="name" v-model="value" :required="required">
        <option
            v-for="option in schema.enum"
              :value="option"
              :key="option">
            {{ option }}
        </option>
      </b-select>
    </template>
    <template v-else-if="type === 'string'">
      <b-input 
          :placeholder="name" 
          v-model="value" 
          :pattern="schema.pattern" 
          :validation-message="(schema.pattern) ? `Field must conform to pattern: ${schema.pattern}` : undefined" 
          type="text"
          :required="required"></b-input>
    </template>
    <template v-else-if="type === 'number'">
      <b-input :placeholder="name" v-model="value" type="number" :required="required"></b-input>
    </template>
    <template v-else-if="type === 'boolean'">
      <b-checkbox v-model="value">
          {{ name }}
      </b-checkbox>
    </template>
    <template v-else-if="type === 'object'">
      <JsonSchemaFormElement v-for="(child, key) in schema.properties" :schema="child" :key="key" :name="key" :required="schema.required?.includes(key)" @input="emitValue"></JsonSchemaFormElement>
    </template>
    <template v-else-if="type === 'array'">
      <template v-if="getType(schema.items) !== 'string'">Only string arrays supported at this moment</template>
      <template v-else>
        <b-taginput
            v-model="value" 
            ellipsis 
            :data="schema.items.enum"
            :allow-new="!schema.items.enum"
            autocomplete
            :placeholder="name"
            ></b-taginput>
      </template>
    </template>
  </component>
  </b-field>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'JsonSchemaFormElement',
  props: {
    schema: {
      type: Object,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    didId: {
      type: String,
      required: false
    },
    required: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      value: undefined as any,
      type: undefined as string | undefined
    }
  },
  watch: {
    value(newValue) {
      this.$emit('input', newValue)
    }
  },
  mounted() {
    this.type = this.getType(this.schema);
    if (this.type === 'const') {
      this.value = this.schema.const;
      // this.$emit('input', this.schema.const);
    } else if (this.type === 'object') {
      this.value = {}
    } else if (this.type === 'array') {
      this.value = []
    }
    if (this.schema.default) {
      this.value = this.schema.default;
    }
    if (this.didId && this.type === 'string' && this.name === 'id') {
      this.value = this.didId;
    }
  },
  methods: {
    getType(schema: any) {
      let type;
      if (schema.const) {
        type = "const";
      } else if (schema.enum) {
        type = "enum";
      } else if (schema.type) {
        switch (schema.type) {
          case 'string': type = 'string'; break;
          case 'number': type = 'number'; break;
          case 'integer': type = 'number'; break;
          case 'object': type = 'object'; break;
          case 'array': type = 'array'; break;
          case 'boolean': type = 'boolean'; break;
        }
      }
      return type;
    },
    emitValue(value: any) {
      this.value = value;
      this.$emit('input', this.value)
    }
  }
})

</script>