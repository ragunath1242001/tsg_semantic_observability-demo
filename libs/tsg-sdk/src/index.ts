// Main facade
export { TsgSdk } from "./tsg-sdk.js";

// Configuration
export * from "./config/index.js";

// Typed API clients
export * from "./client.js";

// Auth
export * from "./auth/index.js";

// Re-export DTOs from monorepo packages used for validation
export {
  CatalogSchema,
  ContractNegotiationSchema,
  DataPlaneDetailsDto,
  DatasetSchema,
  TransferDetailDto,
  TransferProcessSchema
} from "@tsg-dsp/common-dsp";
export {
  DIDDocumentDto,
  NegotiationDetailDto,
  NegotiationStatusDto,
  ServiceDto,
  SignedJwtResponse
} from "@tsg-dsp/common-dtos";
export {
  ChangePasswordDto,
  ClientDto,
  CreateClientDto,
  CreateUserDto,
  UpdateClientDto,
  UpdateUserDto,
  UserDto,
  UserWithPasswordDto
} from "@tsg-dsp/sso-bridge-dtos";
export {
  CredentialOffer,
  CredentialOfferStatus,
  KeyInfo
} from "@tsg-dsp/wallet-dtos";

// SDK modules
export * from "./catalog/index.js";
export * from "./negotiations/index.js";
export * from "./sso/index.js";
export * from "./transfers/index.js";
export * from "./wallet/index.js";

// Utilities
export * from "./utils/index.js";
