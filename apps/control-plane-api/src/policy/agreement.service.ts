import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  Agreement,
  AgreementDto,
  deserialize,
  HashedMessage,
} from "@tsg-dsp/common-dsp";
import { DSPError } from "../utils/errors/error";
import { AgreementDao } from "../model/agreement.dao";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class AgreementService {
  constructor(
    @InjectRepository(AgreementDao)
    private readonly agreementRepository: Repository<AgreementDao>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async getAgreementDao(id: string): Promise<AgreementDao> {
    const agreement = await this.agreementRepository.findOneBy({ id: id });
    if (!agreement) {
      throw new DSPError(
        `Agreement with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return agreement;
  }

  async getAgreement(id: string): Promise<Agreement>;
  async getAgreement(id: string, dto: false): Promise<Agreement>;
  async getAgreement(id: string, dto: true): Promise<AgreementDto>;
  async getAgreement(
    id: string,
    dto: boolean = false
  ): Promise<Agreement | AgreementDto> {
    const agreement = await this.getAgreementDao(id);
    if (dto) {
      return agreement.agreement;
    } else {
      const a = await deserialize<Agreement>({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        ...agreement.agreement,
      });
      return a;
    }
  }

  async storeAgreement(
    agreement: AgreementDto,
    negotiationId: string,
    localSignature?: HashedMessage,
    remoteSignature?: HashedMessage
  ): Promise<AgreementDao> {
    return await this.agreementRepository.save({
      id: agreement["@id"],
      agreement: agreement,
      negotiationId: negotiationId,
      localSignature: localSignature,
      remoteSignature: remoteSignature,
      transfers: [],
    });
  }
}
