import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { KubernetesService } from "./kubernetes.service.js";
import { RootConfig } from "../config.js";
import { ApiException, V1Secret } from "@kubernetes/client-node";

describe("KubernetesService", () => {
  let service: KubernetesService;
  const mockConfig: Partial<RootConfig> = {
    kubernetesNamespace: "default"
  };

  // Create a fake CoreV1Api object with jest.fn() mocks
  const fakeCoreV1Api = {
    createNamespacedSecret: jest.fn(),
    replaceNamespacedSecret: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KubernetesService,
        { provide: RootConfig, useValue: mockConfig }
      ]
    }).compile();

    service = module.get<KubernetesService>(KubernetesService);

    // Override the coreV1Api with our fake API
    (service as any).coreV1Api = fakeCoreV1Api;

    // Clear previous calls for each test
    fakeCoreV1Api.createNamespacedSecret.mockClear();
    fakeCoreV1Api.replaceNamespacedSecret.mockClear();
  });

  describe("applySecret", () => {
    const secretName = "test-secret";
    const data = { key1: "value1" };
    const encodedData = { key1: Buffer.from("value1").toString("base64") };
    const secretBody = {
      metadata: { name: secretName, namespace: mockConfig.kubernetesNamespace },
      data: encodedData,
      type: "Opaque"
    };

    it("should create secret if it does not exist", async () => {
      const fakeSecret: V1Secret = { ...secretBody };
      jest
        .spyOn(fakeCoreV1Api, "createNamespacedSecret")
        // @ts-expect-error - mockResolvedValueOnce is not recognized
        .mockResolvedValueOnce(fakeSecret);

      // Simulate successful creation

      const result = await service.applySecret(secretName, data);

      expect(fakeCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith({
        namespace: mockConfig.kubernetesNamespace,
        body: secretBody
      });
      expect(result).toEqual(fakeSecret);
    });

    it("should update secret if it already exists (conflict error)", async () => {
      const conflictError = new ApiException(409, "Conflict", "{}", {});

      // Simulate create returning a conflict error
      // @ts-expect-error - mockRejectedValueOnce is not recognized
      fakeCoreV1Api.createNamespacedSecret.mockRejectedValue(conflictError);

      const fakeUpdatedSecret: V1Secret = { ...secretBody };
      // Simulate update success
      fakeCoreV1Api.replaceNamespacedSecret.mockResolvedValue(
        // @ts-expect-error - mockResolvedValueOnce is not recognized
        fakeUpdatedSecret
      );

      const result = await service.applySecret(secretName, data);

      expect(fakeCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith({
        namespace: mockConfig.kubernetesNamespace,
        body: secretBody
      });
      expect(fakeCoreV1Api.replaceNamespacedSecret).toHaveBeenCalledWith({
        name: secretName,
        namespace: mockConfig.kubernetesNamespace,
        body: secretBody
      });
      expect(result).toEqual(fakeUpdatedSecret);
    });

    it("should throw update error when secret update fails", async () => {
      const conflictError = new ApiException(409, "Conflict", "{}", {});
      // @ts-expect-error - mockRejectedValueOnce is not recognized
      fakeCoreV1Api.createNamespacedSecret.mockRejectedValue(conflictError);

      const updateError: any = new Error("Update failed");
      // @ts-expect-error - mockRejectedValueOnce is not recognized
      fakeCoreV1Api.replaceNamespacedSecret.mockRejectedValue(updateError);

      await expect(service.applySecret(secretName, data)).rejects.toThrow(
        "Error updating secret test-secret in namespace default"
      );

      expect(fakeCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith({
        namespace: mockConfig.kubernetesNamespace,
        body: secretBody
      });
      expect(fakeCoreV1Api.replaceNamespacedSecret).toHaveBeenCalledWith({
        name: secretName,
        namespace: mockConfig.kubernetesNamespace,
        body: secretBody
      });
    });

    it("should throw error if createNamespacedSecret fails with non-conflict error", async () => {
      const otherError = new ApiException(500, "Other error", "{}", {});
      // @ts-expect-error - mockRejectedValueOnce is not recognized
      fakeCoreV1Api.createNamespacedSecret.mockRejectedValue(otherError);

      await expect(service.applySecret(secretName, data)).rejects.toThrow(
        "Error updating secret test-secret in namespace default"
      );

      expect(fakeCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith({
        namespace: mockConfig.kubernetesNamespace,
        body: secretBody
      });
      // replaceNamespacedSecret should not be called
      expect(fakeCoreV1Api.replaceNamespacedSecret).not.toHaveBeenCalled();
    });
  });
});
