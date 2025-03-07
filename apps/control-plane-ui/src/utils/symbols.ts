import { AxiosInstance } from "axios";
import { InjectionKey } from "vue";

export const AxiosKey: InjectionKey<AxiosInstance> = Symbol("http");
