import { jest } from "@jest/globals";
import {
  AgreementDto,
  CatalogDto,
  ContractNegotiationState,
  DatasetDto,
  OfferDto,
  TransferProcessDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import { NegotiationDetailDto } from "@tsg-dsp/common-dtos";
const offerDto: OfferDto = {
  "@type": "Offer",
  "@id": "urn:uuid:offer",
  assigner: "did:web:localhost",
  permission: [{ "@type": "Permission", action: "use" }]
};
const datasetDto: DatasetDto = {
  "@type": "Dataset",
  "@id": "urn:uuid:test",
  title: "Test Dataset",
  hasPolicy: [offerDto],
  distribution: []
};
const catalogDto: CatalogDto = {
  "@type": "Catalog",
  "@id": "urn:uuid:catalog",
  participantId: "did:web:localhost",
  dataset: [datasetDto]
};
const agreementDto: AgreementDto = {
  "@type": "Agreement",
  "@id": "urn:uuid:agreement",
  assigner: "did:web:localhost",
  assignee: "did:web:localhost",
  timestamp: "2025-07-01T00:00:00Z",
  target: "urn:uuid:test"
};
const transferProcessDto: TransferProcessDto = {
  "@type": "TransferProcess",
  consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
  providerPid: "urn:uuid:abcd1234-5678-90ab-cdef-1234567890ab",
  state: TransferState.REQUESTED
};
const negotiationDetailDto: NegotiationDetailDto = {
  localId: "urn:uuid:12345678-1234-1234-1234-123456789012",
  remoteId: "urn:uuid:abcd1234-5678-90ab-cdef-1234567890ab",
  remoteParty: "did:web:localhost",
  role: "consumer",
  remoteAddress: "http://localhost",
  state: ContractNegotiationState.FINALIZED,
  dataSet: "urn:uuid:test",
  modifiedDate: new Date("2025-07-01T00:00:00Z"),
  offer: {
    "@type": "Offer",
    "@id": "urn:uuid:offer",
    assigner: "did:web:localhost",
    permission: [{ "@type": "Permission", action: "use" }]
  },
  agreement: {
    "@type": "Agreement",
    "@id": "urn:uuid:agreement",
    assigner: "did:web:localhost",
    assignee: "did:web:localhost",
    timestamp: "2025-07-01T00:00:00Z",
    target: "urn:uuid:test"
  },
  events: []
};

export const ManagementClientMock = {
  getOwnCatalog: jest.fn(() => catalogDto),
  getOwnParticipantId: jest.fn(() => "did:web:localhost"),
  getParticipantCatalog: jest.fn(() => catalogDto),
  fetchDatasetForParticipant: jest.fn(() => datasetDto),
  getDataset: jest.fn(() => datasetDto),
  getAgreement: jest.fn(() => agreementDto),
  getNegotiationForDataset: jest.fn(() => negotiationDetailDto),
  requestNegotiation: jest.fn(() => negotiationDetailDto),
  requestTransfer: jest.fn(() => transferProcessDto),
  transferStart: jest.fn(() => ({ status: "OK" })),
  transferComplete: jest.fn(() => ({ status: "OK" })),
  transferTerminate: jest.fn(() => ({ status: "OK" })),
  transferSuspend: jest.fn(() => ({ status: "OK" }))
};
