# Process Flows

This document details the key process flows and interactions within the TSG Control Plane, focusing on Dataspace Protocol implementation and component coordination. For overall system architecture, see the [TSG Architecture documentation](../../architecture/README.md).

## Registry Discovery Flow

The registry functionality enables discovery and cataloging of dataspace participants and their offerings through a federated approach that maintains participant autonomy.

**Registry Process:**
1. **Participant Discovery** - The registry maintains information about dataspace participants and their capabilities
2. **Catalog Federation** - Integrates with the `CatalogModule` to provide unified access to distributed catalogs
3. **Wallet Integration** - Uses the dataspace wallet to fetch participant information and maintain trust relationships
4. **Unified Presentation** - Registry data is combined with catalog information to present a complete view

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

## Dataspace Protocol Interactions

The Control Plane implements complete Dataspace Protocol flows for secure data exchange between participants. These interactions assume authentication is required for catalog access and datasets are retrieved with the same authorization as catalog access.

### Consumer-Side Interactions

#### Catalog Discovery and Initialization

```mermaid
sequenceDiagram
Participant C as Consumer
Participant WC as Wallet Consumer
Participant CPC as Control Plane Consumer
Participant DPC as Data Plane Consumer
Participant DPP as Data Plane Provider

C->>CPC: Request catalog
CPC->>WC: Validate credentials
WC-->>CPC: Authentication token
CPC->>DPP: Fetch catalog with auth
DPP-->>CPC: Catalog data
CPC-->>C: Catalog
```

#### Contract Negotiation Process

The contract negotiation follows the Dataspace Protocol specification with support for policy evaluation and agreement verification:

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
CPP->>CPC: http://<consumer>/callbacks/negotiations/<uuid>/agreement <br> AgreementMessage
CPC-->>CPP: Agreement
C->>CPC: POST http://<consumer>/management/negotiation<br>/<uuid>/verify
CPC->>CPP: POST http://<provider>/negotiations/<uuid>/agreement/verification
CPP-->>CPC: Verification
P->>CPP: POST http://<provider>/management/negotiations/<uuid>/finalize
CPP->>CPC: POST http://<consumer>/callbacks/negotiations/<uuid>/events <br> ContractNegotiationEventMessage
CPC-->>CPP: ContractNegotiationEvent
```

#### Data Transfer Execution

The transfer process coordinates between control planes and data planes to execute secure data exchange:

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
CPP->>CPC: POST http://<consumer>/callbacks/transfer/<uuid>/start
CPC-->>CPP: Resp
CPC->>DPC: POST http://<consumerDataPlane>/transfer/<uuid>/start
C->>DPC: POST http://<consumerDataPlane/transfer/<uuid>/execute/<version>/<path>
DPC->DPP: Pull Data
DPP-->>DPC: Resp
alt consumer ends
C->>CPC: POST http://<consumer>/management/transfer/<uuid>/completion
CPC->CPP: POST http://<provider>/transfer/<uuid>/completion
CPP-->>CPC: Resp
CPC->DPC: POST http://<consumerDataPlane>/transfer/<uuid>/completion
else data plane ends
DPC->>CPC: POST http://<consumer>/transfer/<uuid>/completion
CPC->>CPP: POST http://<provider>/transfer/<uuid>/completion
CPP-->>CPC: Resp
end
```

## Key Process Characteristics

### Authentication and Authorization
- All catalog access requires Verifiable Credential authentication
- Policy evaluation is integrated into negotiation and transfer processes
- SSI-based identity management ensures participant autonomy

### State Management
- Event-driven architecture maintains process state across negotiations and transfers
- Database persistence ensures process continuity and audit trails
- Listeners coordinate state transitions between modules

### Data Plane Coordination
- Control Plane orchestrates but delegates data handling to specialized data planes
- Transfer completion can be initiated by either consumer or data plane
- Flexible architecture supports multiple data plane types (HTTP, Analytics)

### Error Handling and Resilience
- Protocol-compliant error responses maintain interoperability
- Retry logic and state recovery ensure robust operation
- Monitoring and health checks provide operational visibility

These process flows implement the complete Dataspace Protocol specification while integrating with TSG's SSI-based identity and policy framework.
