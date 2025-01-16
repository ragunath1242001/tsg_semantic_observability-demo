import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { RuleRepositoryService } from "./rule.repository.service.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransferMonitorDao } from "../model/agreement.dao.js";
import { Evaluation } from "./evaluation.js";
import { DSPError } from "../utils/errors/error.js";
import { AgreementService } from "./agreement.service.js";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import { RootConfig } from "../config.js";
import { EvaluationTrigger } from "./constraint.dto.js";
import { EvaluationContext, EvaluationDecision } from "./evaluation.dto.js";

@Injectable()
export class PolicyEvaluationService {
  constructor(
    private readonly config: RootConfig,
    private readonly ruleRepositoryService: RuleRepositoryService,
    @InjectRepository(TransferMonitorDao)
    private readonly transferMonitorRepository: Repository<TransferMonitorDao>,
    private readonly agreementService: AgreementService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async initializeContext(
    agreementId: string,
    role: "consumer" | "provider",
    scope: EvaluationTrigger,
    transferId: string,
    remoteParticipant: string,
    action: string,
    verifiableCredentials: VerifiableCredential[]
  ): Promise<EvaluationContext> {
    this.logger.debug(`Initializing context for ${agreementId}`);
    const agreement = await this.agreementService.getAgreementDao(agreementId);

    const context = EvaluationContext.parse({
      role: role,
      scope: scope,
      transferId: transferId,
      localParticipant: this.config.iam.didId,
      remoteParticipant: remoteParticipant,
      target: agreement.agreement["odrl:target"],
      action: action,
      verifiableCredentials: verifiableCredentials,
      evaluationTime: new Date(),
      policy: {
        agreement: agreement.agreement,
        localSignature: agreement.localSignature,
        remoteSignature: agreement.remoteSignature,
        signatureStatus: agreement.remoteSignature ? "verified" : "-"
      }
    });
    this.logger.debug(
      `Resulting context:\n${JSON.stringify(context, null, 2)}`
    );
    return context;
  }

  async evaluate(context: EvaluationContext): Promise<EvaluationDecision> {
    this.logger.debug(
      `Evaluating for context: agreement ${context.policy.agreement} & transfer ${context.transferId}`
    );
    const evaluation = new Evaluation(context, this.ruleRepositoryService);
    const decision = await evaluation.evaluate();
    if (context.transferId) {
      await this.transferMonitorRepository.save({
        id: context.transferId,
        agreement: {
          id: context.policy.agreement["@id"]
        },
        lastContext: context,
        lastDecision: decision
      });
    }
    return decision;
  }

  async evaluateDataPlane(
    transferId: string,
    transferContext: Record<string, any>
  ): Promise<EvaluationDecision> {
    this.logger.debug(
      `Evaluating for data plane: ${transferId} & data plane context: \n${JSON.stringify(
        transferContext,
        null,
        2
      )}`
    );
    const context = await this.getLastContext(transferId);
    context.transfer = transferContext;
    return await this.evaluate(context);
  }

  async getLastContext(transferId: string): Promise<EvaluationContext> {
    const transferMonitor = await this.transferMonitorRepository.findOneBy({
      id: transferId
    });
    if (!transferMonitor?.lastContext) {
      throw new DSPError(
        `No context found for transfer ${transferId}`,
        HttpStatus.NOT_FOUND
      );
    }
    return transferMonitor.lastContext;
  }

  async getLastDecision(transferId: string): Promise<EvaluationDecision> {
    const transferMonitor = await this.transferMonitorRepository.findOneBy({
      id: transferId
    });
    if (!transferMonitor?.lastDecision) {
      throw new DSPError(
        `No decision found for transfer ${transferId}`,
        HttpStatus.NOT_FOUND
      );
    }
    return transferMonitor.lastDecision;
  }
}
