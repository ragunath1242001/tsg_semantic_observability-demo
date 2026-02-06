import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { PaginationOptionsDto } from "@tsg-dsp/common-api";
import { Repository } from "typeorm";

import { TransferService } from "../dsp/transfer/transfer.service.js";
import { TransferMonitorDao } from "../model/agreement.dao.js";
import { EvaluationTrigger } from "./constraint.dto.js";
import { PolicyEvaluationService } from "./policy.evaluation.service.js";

@Injectable()
export class AgreementMonitorService implements OnApplicationBootstrap {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(TransferMonitorDao)
    private readonly transferMonitorRepository: Repository<TransferMonitorDao>,
    @Inject(PolicyEvaluationService)
    private readonly policyEvaluationService: PolicyEvaluationService,
    @Inject(forwardRef(() => TransferService))
    private readonly transferService: TransferService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  onApplicationBootstrap() {
    const interval = setInterval(this.monitorAgreements.bind(this), 3600000);
    this.schedulerRegistry.addInterval("monitorAgreements", interval);
  }

  async monitorAgreements() {
    this.logger.log(`Interval based monitoring active agreement transfers`);
    const transfers = await this.transferService.getTransfers(
      PaginationOptionsDto.NO_PAGINATION,
      true
    );
    // TODO: Use pagination to fetch batches of transfers instead of all at once
    for (const transfer of transfers.data) {
      const transferMonitor = await this.transferMonitorRepository.findOneBy({
        id: transfer.id
      });
      if (!transferMonitor) {
        this.logger.warn(
          `No transfer monitor found for transfer ${transfer.id}!`
        );
        continue;
      }

      const context = transferMonitor.lastContext;
      context.scope =
        context.role === "provider"
          ? EvaluationTrigger.PROVIDER_CONTINUOUS
          : EvaluationTrigger.CONSUMER_CONTINUOUS;
      const decision = await this.policyEvaluationService.evaluate(context);
      this.logger.debug(`Evaluating transfer ${transferMonitor.id}`);
      if (decision.decision === "DENY") {
        this.logger.warn(
          `Policy evaluation for transfer ${transferMonitor.id} resulted in a DENY, suspending the transfer`
        );
        await this.transferService.suspend(
          transfer.id,
          "Continuous agreement check failed",
          false
        );
      }
    }
  }
}
