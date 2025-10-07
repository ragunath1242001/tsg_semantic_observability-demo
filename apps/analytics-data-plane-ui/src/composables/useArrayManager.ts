import type { Ref } from "vue";
import { ref } from "vue";

export function useArrayManager<T = string>(initialArray: T[] = []) {
  const items = ref([...initialArray]) as Ref<T[]>;

  const addFromInput = (input: string, delimiter = ",") => {
    if (!input?.trim()) return;

    const newItems = input
      .split(delimiter)
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) => item && item !== "") as T[];

    if (newItems.length > 0) {
      items.value.push(...newItems);
    }
  };

  const removeItem = (index: number) => {
    if (index >= 0 && index < items.value.length) {
      items.value.splice(index, 1);
    }
  };

  const removeItems = (predicate: (item: T) => boolean) => {
    items.value = items.value.filter((item) => !predicate(item));
  };

  const clear = () => {
    items.value = [];
  };

  const addItem = (item: T) => {
    items.value.push(item);
  };

  const setItems = (newItems: T[]) => {
    items.value = [...newItems];
  };

  const cleanArray = () => {
    items.value = items.value
      .map((item) => (typeof item === "string" ? (item.trim() as T) : item))
      .filter((item) => {
        if (typeof item === "string") {
          return item.length > 0;
        }
        return item !== null && item !== undefined;
      });
  };

  return {
    items,
    addFromInput,
    removeItem,
    removeItems,
    clear,
    addItem,
    setItems,
    cleanArray
  };
}
