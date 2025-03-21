# TNO Security Gateway documentation

Welcome to the TNO Security Gateway documentation. This folder contains all the documentation that is available for the TNO Security Gateway. It is divided into apps folders for each component, describing the architecture and all of the configurable parameters. There is a seperate section [Deployment](./deployment/) for deployment of all the components.

## Structure

- Apps
  - [Analytics Data Plane](./apps/analytics-data-plane/)
  - [Control Plane](./apps/control-plane/)
  - [HTTP Data Plane](./apps/http-data-plane/)
  - [SSO Bridge](./apps/sso-bridge/)
  - [Wallet](./apps/wallet/)
- [Deployment](./deployment/)
- Tools
  - [CLI Tool](./tools/cli/)

## General introduction
The TNO Security Gateway allows users to participate in data spaces, bridging the gap towards technical interoperability. The TSG consists of a couple of components that are crucial for participation in data spaces, and an Oauth server (SSO Bridge) that acts as a service to provide authentication to e.g. UIs and to ensure safe communication between the components. The crucial components are the Wallet, Control Plane and Data Plane. The Data Plane has two options: 
(1) the HTTP Data Plane, which is probably the one a reader should be using 
(2) the Analytics Data Plane, used for orchestrating distributed analyses over multiple parties.

The overall architecture (as to how the components work together and how they interact) can be seen in the figure below:

![Component diagram](/img/component-diagram.png)

## Specifications
There are several protocols in the figure above that are generic. This section provides links to the relevant specifications and highlights the choices that were made for the TSG components.

### DID Resolvement
The DID Resolvement Protocols correspond to [Decentralized Identifier](https://www.w3.org/TR/did-1.0/) resolvement protocols. The TSG Wallet supports [did:web](https://w3c-ccg.github.io/did-method-web/) and [did:tdw](https://identity.foundation/didwebvh/v0.3/). 

### Verifiable Credentials
The Credential Issuance Protocols concern the issuance of [Verifiable Credentials](https://www.w3.org/TR/vc-overview/). The TSG Wallet supports [OpenID for Verifiable Credential Issuance](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) and [Eclipse Decentralized Claims Protocol](https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol/v1.0-RC1/).

The [Verfiable Presentation](https://www.w3.org/TR/vc-overview/) Protocols that are supported by the TSG Wallet are [OpenID for Verifiable Presentations](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) and [Eclipse Decentralized Claims Protocol](https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol/v1.0-RC1/).

### Data Space Protocols

The Data Space Protocols between the Control Planes are limited to one implementation, namely the [Eclipse Dataspace Protocol](https://eclipse-dataspace-protocol-base.github.io/DataspaceProtocol/2025-1-RC1/).

### Data Space Component
Within the Data Space Component we see Internal protocols between the Control Plane and the Data Plane(s). These are not specified yet and can be inspected by viewing APIs on this documentation. 

### Data Exchange

For communication between the Data Plane(s), several Data Exchange Protocols can be used. The specific protocol depends on the data plane implementation. Examples of these protocols are [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), [MQTT](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html), [Apache Kafka](https://kafka.apache.org/documentation/). The TSG currently supports the HTTP Protocol with the HTTP Data Plane and specific protocols for Multi Party Computation and Federated Learning for the Analytics Data Plane.