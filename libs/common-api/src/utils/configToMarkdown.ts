/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import "reflect-metadata";

import {
  ClassConstructor,
  defaultMetadataStorage,
  TypeMetadata
} from "class-transformer";
import {
  getMetadataStorage,
  registerDecorator,
  ValidationOptions
} from "class-validator";
import { ValidationMetadata } from "class-validator/types/metadata/ValidationMetadata.js";
import { appendFileSync, readFileSync, writeFileSync } from "fs";

export function Description(
  description: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "description",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [description],
      options: validationOptions,
      validator: {
        validate() {
          return true;
        }
      }
    });
  };
}

type NestedStructure = PropertyStructure | ClassStructure;
type PrimitiveOrObjectStructure = Function | Map<string, NestedStructure>;

interface PropertyStructure {
  validationMetadata: ValidationMetadata[];
  default: string;
}

interface SubTypeStructure {
  name: string;
  className: string;
  structure: PrimitiveOrObjectStructure;
}

interface ClassStructure {
  validationMetadata: ValidationMetadata[];
  className: string;
  type: PrimitiveOrObjectStructure;
  isArray: boolean;
  discriminator?: string;
  subTypes?: SubTypeStructure[];
}

interface ConfigRow {
  key: string;
  required: string;
  type: string;
  description: string;
  default: string;
}

const isProperty = (
  structure: NestedStructure
): structure is PropertyStructure => {
  return "default" in structure;
};

export class ConfigToMarkdown {
  constructor(private readonly root: Function) {}
  readonly validatorMetadataStorage = getMetadataStorage();
  readonly transformerMetadataStorage = defaultMetadataStorage;

  writeToFile(path: string, templatePath: string): void {
    const structure = this.getStructure(this.root);
    if (structure instanceof Map) {
      const template = readFileSync(templatePath, "utf-8");
      writeFileSync(
        path,
        "---\n[comment]: # (This file is auto generated)\nhide_table_of_contents: true\n---\n"
      );
      appendFileSync(path, template);
      appendFileSync(path, this.generateTable(structure));
    } else {
      throw new Error("Root config must be a map");
    }
  }

  private generateTable(structure: Map<string, NestedStructure>): string {
    const rows = this.structureToRows(structure);

    rows.unshift({
      key: "Key",
      required: "Required",
      type: "Type",
      description: "Description",
      default: "Default"
    });

    const keyMax = Math.max(...rows.map((row) => row.key.length));
    const requiredMax = Math.max(...rows.map((row) => row.required.length));
    const typeMax = Math.max(...rows.map((row) => row.type.length));
    const descriptionMax = Math.max(
      ...rows.map((row) => row.description.length)
    );
    const defaultMax = Math.max(...rows.map((row) => row.default.length));
    rows.splice(1, 0, {
      key: "-".repeat(keyMax),
      required: "-".repeat(requiredMax),
      type: "-".repeat(typeMax),
      description: "-".repeat(descriptionMax),
      default: "-".repeat(defaultMax)
    });
    rows.forEach((row) => {
      row.key = row.key.padEnd(keyMax);
      row.required = row.required.padEnd(requiredMax);
      row.type = row.type.padEnd(typeMax);
      row.description = row.description.padEnd(descriptionMax);
      row.default = row.default.padEnd(defaultMax);
    });
    return (
      rows
        .map(
          (row) =>
            `| ${row.key} | ${row.required} | ${row.type} | ${row.description} | ${row.default} |`
        )
        .join("\n") + "\n"
    );
  }

  private estimateType(metadatas: ValidationMetadata[]): string {
    if (metadatas.some((metadata) => metadata.name === "isIn"))
      return (
        metadatas
          .find((metadata) => metadata.name === "isIn")
          ?.constraints[0]?.map((element: string) => `"${element}"`)
          ?.join(" \\| ") ?? "-"
      );
    if (metadatas.some((metadata) => metadata.name === "isUrl")) return "URL";
    if (metadatas.some((metadata) => metadata.name === "isString"))
      return "String";
    if (metadatas.some((metadata) => metadata.name === "isNumber"))
      return "Number";
    if (metadatas.some((metadata) => metadata.name === "isBoolean"))
      return "Boolean";
    if (metadatas.some((metadata) => metadata.name === "isEnum")) {
      return (
        metadatas
          .find((metadata) => metadata.name === "isEnum")
          ?.constraints[1]?.map((element: string) => `"${element}"`)
          ?.join(" \\| ") ?? "-"
      );
    }
    if (metadatas.some((metadata) => metadata.name === "isObject"))
      return "Object";
    if (metadatas.some((metadata) => metadata.name === "isArray"))
      return "Array";
    return "Unknown";
  }

  private getStructure(
    type: Function
  ): Function | Map<string, NestedStructure> {
    const typeMetadata: Map<string, TypeMetadata> =
      defaultMetadataStorage["_typeMetadatas"].get(type);
    const metadatas =
      this.validatorMetadataStorage.getTargetValidationMetadatas(
        type,
        "",
        false,
        true
      );
    const metadataPerProperty =
      this.validatorMetadataStorage.groupByPropertyName(metadatas);
    const structure: Map<string, NestedStructure> = new Map();
    for (const key in metadataPerProperty) {
      const propertyTypeMetadata = typeMetadata?.get(key);
      if (
        !propertyTypeMetadata ||
        propertyTypeMetadata.reflectedType === Number
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const classType = type as ClassConstructor<any>;
        const defaultValue = new classType()[key];
        structure.set(key, {
          validationMetadata: metadataPerProperty[key],
          default: defaultValue ? JSON.stringify(defaultValue) : ""
        });
      } else {
        const propertyStructure: ClassStructure = {
          validationMetadata: metadataPerProperty[key],
          type: this.getStructure(propertyTypeMetadata.typeFunction()),
          isArray: propertyTypeMetadata.reflectedType === Array,
          className: propertyTypeMetadata.typeFunction().name
        };
        if (propertyTypeMetadata.options?.discriminator) {
          propertyStructure.discriminator =
            propertyTypeMetadata.options.discriminator.property;
          propertyStructure.subTypes =
            propertyTypeMetadata.options.discriminator.subTypes.map(
              (subType) => {
                return {
                  name: subType.name,
                  className: subType.value.name,
                  structure: this.getStructure(subType.value)
                };
              }
            );
        }
        structure.set(key, propertyStructure);
      }
    }
    return structure;
  }

  private getDescription(structure: NestedStructure): string {
    return (
      structure.validationMetadata.find(
        (metadata) => metadata.name === "description"
      )?.constraints?.[0] ?? "undefined"
    );
  }

  private code(content: string): string {
    if (content.trim() === "") return content;
    return `\`${content}\``;
  }

  private structureToRows(
    structure: Map<string, NestedStructure>,
    parentKey = ""
  ): ConfigRow[] {
    const rows: ConfigRow[] = [];
    for (const [key, value] of structure) {
      const newKey = `${parentKey}${key}`;
      const optional = value.validationMetadata.some(
        (metadata) => metadata.type === "conditionalValidation"
      );
      if (isProperty(value)) {
        rows.push({
          key: this.code(newKey),
          required: optional || value.default != "" ? "" : "Yes",
          type: this.code(`${this.estimateType(value.validationMetadata)}`),
          description: this.getDescription(value),
          default: this.code(value.default)
        });
        continue;
      }
      const arrayPostfix = value.isArray ? "[]" : "";
      if (value.type instanceof Function) {
        rows.push({
          key: this.code(newKey),
          required: optional ? "" : "Yes",
          type: this.code(`${value.type.name}${arrayPostfix}`),
          description: this.getDescription(value),
          default: ""
        });
      } else {
        rows.push({
          key: `**\`${value.className}\`**`,
          required: "",
          type: "",
          description: "",
          default: ""
        });
        rows.push({
          key: this.code(newKey),
          required: optional ? "" : "Yes",
          type: this.code(`${value.className}${arrayPostfix}`),
          description: this.getDescription(value),
          default: ""
        });
        rows.push(
          ...this.structureToRows(value.type, `${newKey}${arrayPostfix}.`)
        );
      }
      if (value.subTypes) {
        rows.push(
          ...this.subTypesToRows(
            value.subTypes,
            newKey,
            value,
            arrayPostfix,
            optional
          )
        );
      }
    }
    return rows;
  }

  private subTypesToRows(
    subTypes: SubTypeStructure[],
    parentKey: string,
    value: ClassStructure,
    arrayPostfix: string,
    optional: boolean
  ): ConfigRow[] {
    const rows: ConfigRow[] = [];
    for (const subType of subTypes) {
      rows.push({
        key: this.code(
          `${parentKey}{${value.discriminator}=${subType.name}}${arrayPostfix}`
        ),
        required: optional ? "" : "Yes",
        type: this.code(`${subType.className}${arrayPostfix}`),
        description: this.getDescription(value),
        default: ""
      });
      if (subType.structure instanceof Map) {
        rows.push(
          ...this.structureToRows(
            subType.structure,
            `${parentKey}{${value.discriminator}=${subType.name}}${arrayPostfix}.`
          )
        );
      }
    }
    return rows;
  }
}
