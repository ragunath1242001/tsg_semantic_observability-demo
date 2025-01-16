import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class VerifiablePresentationGuard extends AuthGuard("vp") {}
@Injectable()
export class TransferVerifiablePresentationGuard extends AuthGuard(
  "transfervp"
) {}
