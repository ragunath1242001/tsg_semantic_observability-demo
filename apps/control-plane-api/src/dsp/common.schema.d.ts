import { DurationDto, MultilanguageDto, ReferenceDto } from "@tsg-dsp/common-dsp";
export declare class ReferenceSchema implements ReferenceDto {
    "@id": string;
}
export declare class MultilanguageSchema implements MultilanguageDto {
    "@value": string;
    "@language": string;
}
export declare class DurationSchema implements DurationDto {
    "@value": string;
    "@type": "xsd:duration";
}
//# sourceMappingURL=common.schema.d.ts.map