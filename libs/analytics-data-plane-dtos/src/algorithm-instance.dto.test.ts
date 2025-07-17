import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { UIElementType } from "./algorithm-definition.dto.js";
import { AlgorithmInstanceDto } from "./algorithm-instance.dto.js";

describe("Algorithm Definition Service", () => {
  it("Federated learning algorithm instance", async () => {
    const federatedLearningAlgorithmInstance: AlgorithmInstanceDto =
      plainToInstance(AlgorithmInstanceDto, {
        id: "123e4567-e89b-12d3-a456-426614174000",
        algorithmDefinition: {
          title: "Predictive Maintenance Federated Learning",
          description:
            "Federated learning algorithm for predictive maintenance, based on the dataset available https://www.kaggle.com/code/jiejiea/ai4i-2020-predictive-maintenance",
          keywords: ["federated", "learning", "predictive", "maintenance"],
          image: "https://example.com/public-image-url",
          algorithmEvents: [
            {
              name: "data_loaded",
              description: "Data has been loaded",
              type: "json"
            },
            {
              name: "model_trained",
              description: "Model has been trained at one of the nodes",
              type: "blob"
            },
            {
              name: "model_aggregated",
              description: "Model has been aggregated at the server",
              type: "blob"
            },
            {
              name: "start_training",
              description: "Start of a new iteration",
              type: "json"
            },
            {
              name: "finished_training",
              description: "Training has been finished",
              type: "blob"
            },
            {
              name: "error",
              description: "An error has occurred",
              type: "json"
            }
          ],
          roleDefinitions: [
            {
              name: "server",
              cardinality: {
                min: 1,
                max: 1
              },
              states: [
                { name: "init" },
                { name: "waiting_for_models" },
                { name: "aggregating_models" },
                { name: "finished" }
              ],
              communicatesToRoles: ["node"]
            },
            {
              name: "node",
              cardinality: {
                min: 2
              },
              states: [
                { name: "init" },
                { name: "loaded_data" },
                { name: "training" },
                { name: "waiting_for_aggregation" },
                { name: "finished" }
              ],
              communicatesToRoles: ["server"],
              dataRequirements: {
                type: "csv",
                columns: [
                  {
                    name: "Air temperature [K]",
                    type: "xs:float"
                  },
                  {
                    name: "Process temperature [K]",
                    type: "xs:float"
                  },
                  {
                    name: "Rotational speed [rpm]",
                    type: "xs:nonNegativeinteger"
                  },
                  {
                    name: "Torque [Nm]",
                    type: "xs:float"
                  },
                  {
                    name: "Tool wear [min]",
                    type: "xs:float"
                  },
                  {
                    name: "Failure Type",
                    type: "xs:nonNegativeinteger"
                  }
                ]
              }
            }
          ],
          internalEvents: [
            {
              name: "current_iteration",
              description: "Current iteration",
              type: "counter"
            },
            {
              name: "current_epoch",
              description: "Epoch of the current iteration",
              type: "counter"
            },
            {
              name: "resource_usage",
              description:
                "Resource usage (CPU & Memory) of the current iteration",
              type: "gauge"
            },
            {
              name: "validation_results",
              description:
                "Validation results of the current iteration, e.g. accuracy, loss",
              type: "list"
            },
            {
              name: "state",
              description: "Current state of the job",
              type: "status"
            }
          ],
          uiTemplate: [
            {
              metric: "current_iteration",
              description: "Current iteration",
              type: UIElementType.FIELD
            },
            {
              metric: "current_epoch",
              description: "Epoch of the current iteration",
              type: UIElementType.FIELD
            },
            {
              metric: "resource_usage",
              description: "Resource usage of the current iteration",
              type: UIElementType.LINE_GRAPH
            },
            {
              metric: "validation_results",
              description: "Validation results of the current iteration",
              type: UIElementType.TABLE
            },
            {
              metric: "state",
              description: "Current state of the job",
              type: UIElementType.FIELD
            }
          ]
        },
        createdDate: new Date("2023-01-01T00:00:00.000Z"),
        participants: [
          {
            didId: "did:example:123456789",
            role: "server",
            dataset: "dataset1"
          },
          {
            didId: "did:example:987654321",
            role: "node",
            dataset: "dataset2"
          }
        ]
      });
    const errors = validateSync(federatedLearningAlgorithmInstance);
    expect(errors).toHaveLength(0);
  });
});
