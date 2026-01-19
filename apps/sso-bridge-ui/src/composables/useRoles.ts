import { toastError } from "@tsg-dsp/common-ui/utils/error";
import type { AxiosInstance } from "axios";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

export interface Role {
  label: string;
  value: string;
}

/**
 * Composable for loading and managing roles
 */
export const useRoles = (http: AxiosInstance) => {
  const toast = useToast();
  const roles = ref<Role[]>([]);
  const loading = ref(false);

  /**
   * Load roles from the server
   */
  const loadRoles = async (): Promise<void> => {
    loading.value = true;
    try {
      const response = await http.get("/roles");
      roles.value = response.data.map((role: any) => ({
        label: role.name,
        value: role.name
      }));
    } catch (error) {
      toast.add(
        toastError({
          error,
          summary: "Error",
          defaultMessage: "Failed to load roles"
        })
      );
    } finally {
      loading.value = false;
    }
  };

  return {
    roles,
    loading,
    loadRoles
  };
};
