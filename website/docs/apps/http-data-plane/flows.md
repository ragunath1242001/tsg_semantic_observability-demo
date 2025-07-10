# Process Flows

This document details the architectural views and process flows within the TSG HTTP Data Plane, focusing on transfer execution and data access patterns. For overall system architecture, see the [TSG Architecture documentation](../../architecture/README.md).

## Logical View

```mermaid
C4Component
    Container_Boundary(backend, "Backend") {
        Component(auth, "Authentication", "Provides authentication of<br />end-users as well as<br />authentication of other Wallets")
        Component(dataplane, "Data Plane", "Core logic of the data plane")
        Component(logging, "Logging", "Logging of relevant<br />interactions with the data aplane")
        Rel(auth, oauth, "User login", "oAuth2.0")
        Rel(dataplane, logging, "")
        Rel(dataplane, db, "")
        Rel(dataplane, cp, "")
        Rel(logging, db, "")
    }
    System_Ext(oauth, "Identity Provider", "External oAuth serivce managing users")
    System_Ext(cp, "Control Plane", "Control Plane")
    ContainerDb(db, "Relational Database", "Stores all state of Data Plane", "DataPlaneState, Transfer, Log")
    %% Component(frontend, "Frontend", "Provides all management<br />functionality of the Wallet")
    Container_Boundary(frontend, "Frontend") {
        Component(dashoardview, "Dashboard View")
        Component(metadataview, "Metadata View")
        Component(loggingview, "Logging View")
        Component(testerview, "Tester View")
    }
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Process Flows

### Transfer Process Execution (Consumer-Side)

```mermaid
sequenceDiagram
    participant cpi as Control Plane (internal)
    participant ta as Target application
    box Green Data Plane
        participant b as Backend
    end
    participant dpr as Data Plane (remote)

    cpi ->> b: Transfer request
    b ->> b: Determine transfer applicability
    b -->> cpi: Transfer request response

    cpi ->> b: Transfer start (\w DataAddress)
    b -->> cpi: Ack

    alt Proxy via data plane
    ta ->> b: Proxy request
    b ->> dpr: Request
    dpr -->> b: Response
    b -->> ta: Response
    else Direct communication
    ta ->> b: Request DataAddress
    b -->> ta: DataAddress
    ta ->> dpr: Request
    dpr -->> ta: Response
    end
```

### Transfer process execution (provider-side)

```mermaid
sequenceDiagram
    participant cpi as Control Plane (internal)
    participant ta as Target application
    box Green Data Plane
        participant b as Backend
    end
    participant dpr as Data Plane (remote)

    cpi ->> b: Transfer request
    b ->> b: Determine transfer applicability
    b ->> b: Generate authorization key
    b -->> cpi: Transfer request response (\w DataAddress)

    cpi ->> b: Transfer start
    b -->> cpi: Ack

    dpr ->> b: Request
    b ->> ta: Request
    ta -->> b: Response
    b -->> dpr: Response
```
