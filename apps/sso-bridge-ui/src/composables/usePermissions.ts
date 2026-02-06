import { toastError } from "@tsg-dsp/common-ui/utils/error";
import type { AxiosInstance } from "axios";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

/**
 * Composable for loading and managing permissions
 */
export const usePermissions = (http: AxiosInstance) => {
  const toast = useToast();
  const permissions = ref<string[]>([]);
  const loading = ref(false);

  /**
   * Load permissions from the server
   */
  const loadPermissions = async (): Promise<void> => {
    loading.value = true;
    try {
      const response = await http.get("/permissions");
      permissions.value = response.data.map(
        (perm: { permission: string; description: string }) => perm.permission
      );
    } catch (error) {
      toast.add(
        toastError({
          error,
          summary: "Error",
          defaultMessage: "Failed to load permissions"
        })
      );
    } finally {
      loading.value = false;
    }
  };

  return {
    permissions,
    loading,
    loadPermissions
  };
};
