import { type AxiosInstance } from "axios";
import { type InjectionKey } from "vue";

export const AxiosKey: InjectionKey<AxiosInstance> = Symbol("http");
