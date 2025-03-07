import { HttpStatus } from "@nestjs/common";
import {
  ConstraintDto,
  JsonWebSignature2020,
  ODRLAction,
  ODRLOperator
} from "@tsg-dsp/common-dsp";

import { DSPError } from "../utils/errors/error.js";
import {
  AtomicConstraint,
  ConstraintModel,
  ConstraintType,
  DataType,
  EvaluationTrigger
} from "./constraint.dto.js";
import { EvaluationContext, EvaluationResult } from "./evaluation.dto.js";
import { Evaluation } from "./evaluation.js";
import { RuleRepositoryService } from "./rule.repository.service.js";

describe("Constraint Evaluation", () => {
  const ruleRepositoryService: RuleRepositoryService = {
    getConstraintByOdrl: async function (
      constraintDto: ConstraintDto,
      shouldThrow: boolean = false
    ): Promise<ConstraintModel | undefined> {
      if (constraintDto["odrl:operator"] === "odrl:eq") {
        switch (constraintDto["odrl:leftOperand"]) {
          case "tsg:testString":
            return AtomicConstraint.parse({
              type: ConstraintType.ATOMIC,
              title: "Test Constraint",
              description: "Test constraint description",
              leftOperand: "tsg:testString",
              operator: "odrl:eq",
              contextPath: "$.dataPlane.testString",
              dataType: DataType.STRING,
              evaluable: [
                EvaluationTrigger.PROVIDER_ON_REQUEST,
                EvaluationTrigger.PROVIDER_CONTINUOUS,
                EvaluationTrigger.PROVIDER_ON_EXECUTION
              ],
              value: constraintDto["odrl:rightOperand"] as string
            });
          case "tsg:testUri":
            return AtomicConstraint.parse({
              type: ConstraintType.ATOMIC,
              title: "Test Constraint 2",
              description: "Test constraint description 2",
              leftOperand: "tsg:testUri",
              operator: "odrl:eq",
              contextPath: "$.dataPlane.testUri",
              dataType: DataType.URI,
              evaluable: [
                EvaluationTrigger.PROVIDER_ON_REQUEST,
                EvaluationTrigger.PROVIDER_CONTINUOUS,
                EvaluationTrigger.PROVIDER_ON_EXECUTION
              ],
              value: constraintDto["odrl:rightOperand"] as string
            });
          case "tsg:testNumber":
            return AtomicConstraint.parse({
              type: ConstraintType.ATOMIC,
              title: "Test Constraint 3",
              description: "Test constraint description 3",
              leftOperand: "tsg:testNumber",
              operator: "odrl:eq",
              contextPath: "$.dataPlane.testNumber",
              dataType: DataType.NUMBER,
              evaluable: [
                EvaluationTrigger.PROVIDER_ON_REQUEST,
                EvaluationTrigger.PROVIDER_CONTINUOUS,
                EvaluationTrigger.PROVIDER_ON_EXECUTION
              ],
              value: constraintDto["odrl:rightOperand"] as string
            });
          case "tsg:testDate":
            return AtomicConstraint.parse({
              type: ConstraintType.ATOMIC,
              title: "Test Constraint 4",
              description: "Test constraint description 4",
              leftOperand: "tsg:testDate",
              operator: "odrl:eq",
              contextPath: "$.dataPlane.testDate",
              dataType: DataType.DATE,
              evaluable: [
                EvaluationTrigger.PROVIDER_ON_REQUEST,
                EvaluationTrigger.PROVIDER_CONTINUOUS,
                EvaluationTrigger.PROVIDER_ON_EXECUTION
              ],
              value: constraintDto["odrl:rightOperand"] as string
            });
          case "tsg:testDateTime":
            return AtomicConstraint.parse({
              type: ConstraintType.ATOMIC,
              title: "Test Constraint 5",
              description: "Test constraint description 5",
              leftOperand: "tsg:testDateTime",
              operator: "odrl:eq",
              contextPath: "$.evaluationTime",
              dataType: DataType.DATETIME,
              evaluable: [
                EvaluationTrigger.PROVIDER_ON_REQUEST,
                EvaluationTrigger.PROVIDER_CONTINUOUS,
                EvaluationTrigger.PROVIDER_ON_EXECUTION
              ],
              value: constraintDto["odrl:rightOperand"] as string
            });
          case "tsg:testString2":
            return AtomicConstraint.parse({
              type: ConstraintType.ATOMIC,
              title: "Test Constraint 6",
              description: "Test constraint description 6",
              leftOperand: "tsg:testString2",
              operator: "tsg:unknown",
              contextPath: "$.dataPlane.testString",
              dataType: DataType.STRING,
              evaluable: [
                EvaluationTrigger.PROVIDER_ON_REQUEST,
                EvaluationTrigger.PROVIDER_CONTINUOUS,
                EvaluationTrigger.PROVIDER_ON_EXECUTION
              ],
              value: constraintDto["odrl:rightOperand"] as string
            });
        }
      } else if (
        constraintDto["odrl:leftOperand"] === "tsg:vpInputDescriptor"
      ) {
        return AtomicConstraint.parse({
          type: ConstraintType.ATOMIC,
          title: "Test Constraint 7",
          description: "Test constraint description 7",
          leftOperand: "tsg:vpInputDescriptor",
          operator: ODRLOperator.IS_ANY_OF,
          contextPath: "$.verifiableCredentials[:]",
          evaluable: [
            EvaluationTrigger.PROVIDER_ON_REQUEST,
            EvaluationTrigger.PROVIDER_CONTINUOUS,
            EvaluationTrigger.PROVIDER_ON_REQUEST
          ],
          dataType: DataType.DIF_INPUT_DESCRIPTOR,
          value: constraintDto["odrl:rightOperand"] as string
        });
      }
      if (shouldThrow) {
        throw new DSPError(
          `Could not find constraint based on ODRL`,
          HttpStatus.NOT_FOUND
        );
      } else {
        return undefined;
      }
    }
  } as RuleRepositoryService;
  const contextDefaults: EvaluationContext = {
    role: "provider",
    scope: EvaluationTrigger.PROVIDER_ON_REQUEST,
    localParticipant: "did:web:localhost",
    remoteParticipant: "did:web:remote.com",
    target: "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6",
    action: ODRLAction.USE,
    verifiableCredentials: [],
    evaluationTime: new Date("2024-08-01T12:00:00Z"),
    policy: {
      agreement: {
        "@type": "odrl:Agreement",
        "@id": "urn:uuid:00000000-0000-0000-0000-000000000000",
        "odrl:assigner": "did:web:localhost",
        "odrl:assignee": "did:web:remote.com",
        "dspace:timestamp": new Date("2024-08-01T12:00:00Z").toISOString(),
        "odrl:target": "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6",
        "odrl:permission": [
          {
            "@type": "odrl:Permission",
            "odrl:action": ODRLAction.USE
          }
        ]
      },
      localSignature: {
        "dspace:algorithm": "JsonWebSignature2020",
        "dspace:digest": "{}"
      },
      remoteSignature: {
        "dspace:algorithm": "JsonWebSignature2020",
        "dspace:digest": "{}"
      },
      signatureStatus: "verified"
    }
  };
  it("Evaluate strings", async () => {
    const context = EvaluationContext.parse(contextDefaults);
    const evaluation = new Evaluation(context, ruleRepositoryService);

    expect(
      evaluation["evaluateString"](ODRLOperator.EQ, "test", ["test"])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.EQ, "test2", ["test"])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.NEQ, "test2", ["test"])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.NEQ, "test", ["test"])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.IS_ALL_OF, "test", [
        "test",
        "test"
      ])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.IS_ALL_OF, "test", [
        "test",
        "test2"
      ])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.IS_ANY_OF, "test", [
        "test",
        "test2"
      ])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.IS_ANY_OF, "test3", [
        "test",
        "test2"
      ])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.IS_NONE_OF, "test", [
        "test2",
        "test3"
      ])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateString"](ODRLOperator.IS_NONE_OF, "test", [
        "test",
        "test2"
      ])
    ).toBe(EvaluationResult.INVALID);
    for (const operator of [
      ODRLOperator.IS_PART_OF,
      ODRLOperator.GTEQ,
      ODRLOperator.HAS_PART,
      ODRLOperator.IS_A,
      ODRLOperator.GT,
      ODRLOperator.LT,
      ODRLOperator.LTEQ,
      "unknown"
    ]) {
      expect(evaluation["evaluateString"](operator, "test", [])).toBe(
        EvaluationResult.INDECISIVE
      );
    }
  });
  it("Evaluate numbers", async () => {
    const context = EvaluationContext.parse(contextDefaults);
    const evaluation = new Evaluation(context, ruleRepositoryService);

    expect(evaluation["evaluateNumber"](ODRLOperator.EQ, 1, [1])).toBe(
      EvaluationResult.VALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.EQ, 2, [1])).toBe(
      EvaluationResult.INVALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.NEQ, 2, [1])).toBe(
      EvaluationResult.VALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.NEQ, 1, [1])).toBe(
      EvaluationResult.INVALID
    );
    expect(
      evaluation["evaluateNumber"](ODRLOperator.IS_ALL_OF, 1, [1, 1])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateNumber"](ODRLOperator.IS_ALL_OF, 1, [1, 2])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["evaluateNumber"](ODRLOperator.IS_ANY_OF, 1, [1, 2])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateNumber"](ODRLOperator.IS_ANY_OF, 3, [1, 2])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["evaluateNumber"](ODRLOperator.IS_NONE_OF, 1, [2, 3])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["evaluateNumber"](ODRLOperator.IS_NONE_OF, 1, [1, 2])
    ).toBe(EvaluationResult.INVALID);
    expect(evaluation["evaluateNumber"](ODRLOperator.GT, 1, [2])).toBe(
      EvaluationResult.VALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.GT, 1, [1])).toBe(
      EvaluationResult.INVALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.GTEQ, 1, [1])).toBe(
      EvaluationResult.VALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.GTEQ, 1, [0])).toBe(
      EvaluationResult.INVALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.LT, 2, [1])).toBe(
      EvaluationResult.VALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.LT, 1, [1])).toBe(
      EvaluationResult.INVALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.LTEQ, 1, [1])).toBe(
      EvaluationResult.VALID
    );
    expect(evaluation["evaluateNumber"](ODRLOperator.LTEQ, 1, [2])).toBe(
      EvaluationResult.INVALID
    );
    for (const operator of [
      ODRLOperator.IS_PART_OF,
      ODRLOperator.HAS_PART,
      ODRLOperator.IS_A,
      "unknown"
    ]) {
      expect(evaluation["evaluateNumber"](operator, 1, [])).toBe(
        EvaluationResult.INDECISIVE
      );
    }
  });
  it("Evaluate constraints", async () => {
    const context = EvaluationContext.parse({
      ...contextDefaults,
      dataPlane: {
        testString: "Test String",
        testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
        testNumber: 5,
        testDate: "2024-08-01"
      },
      transfer: {}
    });
    const evaluation = new Evaluation(context, ruleRepositoryService);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testString",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "Test String"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testString",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "Test String"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testUri",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testNumber",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "5"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testDate",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "2024-08-01"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    evaluation["context"].evaluationTime = new Date("2024-08-01T12:00:00Z");
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testDateTime",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "2024-08-01T12:00:00Z"
      })
    ).resolves.toBe(EvaluationResult.VALID);

    evaluation["context"].scope = EvaluationTrigger.CONSUMER_ON_REQUEST;
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:testDateTime",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "2024-08-01T12:00:00Z"
      })
    ).resolves.toBe(EvaluationResult.NOT_APPLICABLE);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:unknown",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "2024-08-01T12:00:00Z"
      })
    ).resolves.toBe(EvaluationResult.INVALID);
  });
  it("VC", async () => {
    const context = EvaluationContext.parse({
      ...contextDefaults,
      verifiableCredentials: [
        {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3c.github.io/vc-jws-2020/contexts/v1/"
          ],
          type: ["VerifiableCredential"],
          id: "did:web:remote.example.com#209eb793-8c3b-4d58-b1de-c4a4e15ce448",
          issuer: "did:web:dataspace-authority.example.com",
          issuanceDate: "2024-07-30T13:51:30.571Z",
          expirationDate: "2024-10-30T13:51:30.571Z",
          credentialSubject: {
            id: "did:web:remote.example.com",
            role: "https://example.com/#DataProvider"
          },
          proof: {
            type: "JsonWebSignature2020",
            created: "2024-07-30T13:51:30.581Z",
            proofPurpose: "assertionMethod",
            jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..aMlm-Sb3m18j2IOwUJz8U6g53QOp6IA9gmG6oTZkdz2ibyzweR3CjLpC2uWYld75Mr8udXPjk2GXMVRQeH0mDg",
            verificationMethod: "did:web:dataspace-authority.example.com#key-0"
          } as JsonWebSignature2020
        },
        {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3c.github.io/vc-jws-2020/contexts/v1/"
          ],
          type: [
            "VerifiableCredential",
            "https://example.com/#DataspaceCredential"
          ],
          id: "did:web:remote.example.com#209eb793-8c3b-4d58-b1de-c4a4e15ce448",
          issuer: "did:web:dataspace-authority.example.com",
          issuanceDate: "2024-07-30T13:51:30.571Z",
          expirationDate: "2024-10-30T13:51:30.571Z",
          credentialSubject: {
            id: "did:web:remote.example.com",
            role: "https://example.com/#DataProvider"
          },
          proof: {
            type: "JsonWebSignature2020",
            created: "2024-07-30T13:51:30.581Z",
            proofPurpose: "assertionMethod",
            jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..aMlm-Sb3m18j2IOwUJz8U6g53QOp6IA9gmG6oTZkdz2ibyzweR3CjLpC2uWYld75Mr8udXPjk2GXMVRQeH0mDg",
            verificationMethod: "did:web:dataspace-authority.example.com#key-0"
          } as JsonWebSignature2020
        }
      ],
      dataPlane: {
        testString: "Test String",
        testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
        testNumber: 5,
        testDate: "2024-08-01"
      },
      transfer: {}
    });
    const evaluation = new Evaluation(context, ruleRepositoryService);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:vpInputDescriptor",
        "odrl:operator": "odrl:isAnyOf",
        "odrl:rightOperand": JSON.stringify({
          id: "A specific type of VC",
          name: "A specific type of VC",
          purpose: "We want a VC of this type",
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "VerifiableCredential"
                }
              }
            ]
          }
        })
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:vpInputDescriptor",
        "odrl:operator": "odrl:isAnyOf",
        "odrl:rightOperand": JSON.stringify({
          id: "A specific type of VC",
          name: "A specific type of VC",
          purpose: "We want a VC of this type",
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "DataspaceCredential"
                }
              }
            ]
          }
        })
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:vpInputDescriptor",
        "odrl:operator": "odrl:isAnyOf",
        "odrl:rightOperand": JSON.stringify({
          id: "A specific type of VC",
          name: "A specific type of VC",
          purpose: "We want a VC of this type",
          constraints: {
            fields: [
              {
                path: ["$.issuer"],
                filter: {
                  type: "string",
                  const: "did:web:dataspace-authority.example.com"
                }
              },
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "DataspaceCredential"
                }
              },
              {
                path: ["$.credentialSubject.role"],
                filter: {
                  type: "string",
                  pattern: "DataProvider"
                }
              }
            ]
          }
        })
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateConstraint"]({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "tsg:vpInputDescriptor",
        "odrl:operator": "odrl:isAnyOf",
        "odrl:rightOperand": JSON.stringify({
          id: "A specific type of VC",
          name: "A specific type of VC",
          purpose: "We want a VC of this type",
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "UnknownCredential"
                }
              }
            ]
          }
        })
      })
    ).resolves.toBe(EvaluationResult.INVALID);
  });
  it("Map results", () => {
    const evaluation = new Evaluation(contextDefaults, ruleRepositoryService);
    expect(
      evaluation["mapResults"]([
        EvaluationResult.VALID,
        EvaluationResult.INVALID,
        EvaluationResult.NOT_APPLICABLE,
        EvaluationResult.INDECISIVE
      ])
    ).toBe(EvaluationResult.INVALID);
    expect(
      evaluation["mapResults"]([
        EvaluationResult.VALID,
        EvaluationResult.NOT_APPLICABLE,
        EvaluationResult.INDECISIVE
      ])
    ).toBe(EvaluationResult.VALID);
    expect(
      evaluation["mapResults"]([
        EvaluationResult.INDECISIVE,
        EvaluationResult.NOT_APPLICABLE,
        EvaluationResult.INDECISIVE
      ])
    ).toBe(EvaluationResult.INDECISIVE);
    expect(
      evaluation["mapResults"]([
        EvaluationResult.NOT_APPLICABLE,
        EvaluationResult.NOT_APPLICABLE,
        EvaluationResult.NOT_APPLICABLE
      ])
    ).toBe(EvaluationResult.NOT_APPLICABLE);
  });
  it("Evaluate rules", async () => {
    const context = EvaluationContext.parse({
      ...contextDefaults,
      dataPlane: {
        testString: "Test String",
        testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
        testNumber: 5,
        testDate: "2024-08-01"
      }
    });
    const evaluation = new Evaluation(context, ruleRepositoryService);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:target": "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:target": "urn:uuid:00000000-0000-0000-0000-000000000000"
      })
    ).resolves.toBe(EvaluationResult.NOT_APPLICABLE);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.DELETE
      })
    ).resolves.toBe(EvaluationResult.NOT_APPLICABLE);

    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:assigner": "did:web:localhost",
        "odrl:assignee": "did:web:remote.com"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:assigner": "did:web:remote.com",
        "odrl:assignee": "did:web:localhost"
      })
    ).resolves.toBe(EvaluationResult.NOT_APPLICABLE);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:assigner": "did:web:localhost",
        "odrl:assignee": "did:web:localhost"
      })
    ).resolves.toBe(EvaluationResult.NOT_APPLICABLE);
    evaluation["context"].role = "consumer";
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:assigner": "did:web:remote.com",
        "odrl:assignee": "did:web:localhost"
      })
    ).resolves.toBe(EvaluationResult.VALID);
    evaluation["context"].role = "provider";
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "tsg:testString",
            "odrl:operator": "odrl:eq",
            "odrl:rightOperand": "Test String"
          }
        ],
        "odrl:duty": [
          {
            "@type": "odrl:Duty",
            "odrl:action": ODRLAction.INFORM
          }
        ]
      })
    ).resolves.toBe(EvaluationResult.VALID);
    await expect(
      evaluation["evaluateRule"]({
        "@type": "odrl:Prohibition",
        "odrl:action": ODRLAction.USE,
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "tsg:testString",
            "odrl:operator": "odrl:eq",
            "odrl:rightOperand": "Test String"
          }
        ]
      })
    ).resolves.toBe(EvaluationResult.VALID);
  });
});
