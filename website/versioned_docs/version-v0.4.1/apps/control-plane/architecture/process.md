# Process View

## Registry flow

```mermaid
sequenceDiagram
actor a as End-User
  box Green Wallet
    participant f as Frontend
    participant b as Backend
  end
    participant cp as Control Plane (external)
    participant w as Dataspace Wallet
  a -->> f: Request page
  f -->> b: [/registry/]
  b -->> w: Fetch dataspace participants
  w -->> b: Dataspace participants
  b -->> cp: Fetch catalog
  cp -->> b: Catalog
  b -->> f: Display catalog

```

# Interactions done in DSP

The following assumptions are made:

- Authentication is necessary for retrieving catalogs.
- Datasets are obtained when querying Catalog (same authorization as retrieving catalog)

## Data Plane + Control Plane interactions for the Consumer.

### Initialization

```mermaid
sequenceDiagram
Participant C as Consumer
Participant WC as Wallet Consumer
Participant CPC as Control Plane Consumer
Participant DPC as Data Plane Consumer
Participant DPP as Data Plane Provider
Participant CPP as Control Plane Provicer
Participant WP as Wallet Provider
Participant P as Provider

activate DPC
activate DPP
C->>WC: http://wallet/api/auth/signup <br> ClientSignup
WC-->>C: Clients object
C->>C: Boots up control plane + data plane <br> with client id + secret from wallet
DPC->>CPC: http://<host>/data-plane/init <br> DataPlaneDetailsDto
CPC->>DPC: DataPlaneDetails
DPC->>DPC: Create Dataset + Distribution
DPC->>CPC: http://<host>/data-plane/:datasetid/catalog <br> Dataset
CPC->>CPC: Update Catalog

P->>WP: http://wallet/api/auth/signup <br> ClientSignup
WP-->>P: Clients object
P->>P: Boots up control plane + data plane <br> with client id + secret from wallet
DPP->>CPP: http://<host>data-plane/init <br> DataPlaneDetailsDto
CPP->>DPP: DataPlaneDetails
DPP->>DPP: Create Dataset + Distribution
DPP->>CPP: http://<host>/data-palne/:datasetid/catalog <br> Dataset
CPP->>CPP: Update catalog
```

### Catalog Request

```mermaid
sequenceDiagram
Participant C as Consumer
Participant WC as Wallet Consumer
Participant CPC as Control Plane Consumer
Participant DPC as Data Plane Consumer
Participant DPP as Data Plane Provider
Participant CPP as Control Plane Provicer
Participant WP as Wallet Provider


C->>CPC: http://control-plane/<br>management/catalog/request<br>?address=provider/catalog/request
note over C,CPC: Authorization
CPC->>WC: http://wallet/api/auth/login <br> ClientInfo
WC-->>CPC: {access_token, refresh_token}
CPC-->>WC: http://wallet/api/presentations <br> {credentialId, formatAsJwt, Audience}
WC-->>CPC: VP
CPC->>CPP:http://provider/catalog/request <br> {VP, audience }
CPP->>CPP: Validate VP
CPP->>WP: http://wallet/api/presentations/validate <br> { VP, audience }
WP-->>CPP: True
CPP-->>CPC: Catalog
CPC-->>C: Catalog
```

### Contract Negotiation

```mermaid
sequenceDiagram
Participant C as Consumer
Participant CPC as Control Plane Consumer
Participant DPC as Data Plane Consumer
Participant DPP as Data Plane Provider
Participant CPP as Control Plane Provider
Participant P as Provider


C->>CPC: http://<host>/management/negotiations/request<br>?dataset?address?audience <br> Offer
CPC->>CPP: http://<provider>/negotiations/request <br> NegotiationRequestMessage
CPP-->>CPC: 201 ContractNegotiation <br> Status: REQUESTED
P->>CPP: http://provider/management/negotiations/<uuid>/agreement
CPP->>CPC: http://<consumer>/negotiations/callbacks/<uuid>/agreement <br> AgreementMessage
CPC-->>CPP: Agreement
C->>CPC: POST http://<consumer>/management/negotiation<br>/<uuid>/verify
CPC->>CPP: POST http://<provider>/negotiations/<uuid>/agreement/verification
CPP-->>CPC: Verification
P->>CPP: POST http://<provider>/management/negotiations/<uuid>/finalize
CPP->>CPC: POST http://<consumer>/negotiations/callbacks/<uuid>/events <br> ContractNegotiationEventMessage
CPC-->>CPP: ContractNegotiationEvent
```

### Transfer request

```mermaid
sequenceDiagram
Participant C as Consumer
Participant CPC as Control Plane Consumer
Participant DPC as Data Plane Consumer
Participant DPP as Data Plane Provider
Participant CPP as Control Plane Provider
Participant P as Provider

C->>CPC: POST http://<consumer>/transfer/request<br>?address=<address>&agreementId=<uuid><br>&format=<format>&audience=<audience>
CPC->>DPC: POST http://<consumerDataPlane>/transfer/<br>request/consumer?processId=<uuid>
CPC->>CPP: POST http://<provider>/transfer/request <br> TransferRequestMessage
CPP-->>CPC: TransferProcess
P->>CPP: POST http://<provider>/transfer/<uuid>/start
CPP->>CPC: POST http://<consumer>/transfer/callbacks/<uuid>/start
CPC-->>CPP: Resp
CPC->>DPC: POST http://<consumerDataPlane>/transfer/<uuid>/start
C->>DPC: POST http://<consumerDataPlane/transfer/<uuid>/execute/<version>/<path>
DPC->DPP: Pull Data
DPP-->>DPC: Resp
alt consumer ends
C->>CPC: POST http://<consumer>/management/transfer/<uuid>/complete
CPC->CPP: POST http://<provider>/transfer/<uuid>/complete
CPP-->>CPC: Resp
CPC->DPC: POST http://<consumerDataPlane>/transfer/<uuid>/complete
else data plane ends
DPC->>CPC: POST http://<consumer>/transfer/<uuid>/complete
CPC->>CPP: POST http://<provider>/transfer/<uuid>/complete
CPP-->>CPC: Resp
end
```
