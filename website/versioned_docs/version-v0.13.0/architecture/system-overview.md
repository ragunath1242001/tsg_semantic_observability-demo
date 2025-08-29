# System Overview

## Introduction

The TNO Security Gateway (TSG) is a complete solution that enables organizations to participate in data spaces through secure, standards-based data exchange. It provides the necessary infrastructure to handle identity management, data space protocols, and secure data transfer.

## High-Level Architecture

The TNO Security Gateway architecture is built around four core subsystems that work together to enable secure data space participation. The component diagram below illustrates the detailed interactions and protocol flows between these systems.

![Component diagram](/img/component-diagram.drawio.svg)

### Architecture Overview

The diagram shows how TSG implements a complete data space solution through interconnected components:

**Identity Layer**: At the top, you'll see the **Dataspace Wallet** managing credential issuance protocols and DID resolution. This wallet coordinates with **Participant Wallets** on both sides through credential issuance protocols, establishing the cryptographic foundation for all trust relationships.

**Protocol Coordination**: The **Data Space Components** in the middle implement verifiable presentation protocols, managing the exchange of credentials and establishing trust between participants. These components coordinate with their respective **Control Planes** to orchestrate data space interactions.

**Data Exchange Layer**: At the bottom, **Data Plane(s)** handle the actual secure data transfer using both internal protocols (for coordination) and data space protocols (for external communication). The data planes implement data exchange protocols to facilitate secure information sharing between participants.

**Cross-Component Communication**: The diagram illustrates several key protocol layers:

<span style={{display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#d8b3e8', border: '1px solid #999', marginRight: '6px'}}></span>*Credential Issuance Protocols* - Handle identity and credential management

<span style={{display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#b3d9ff', border: '1px solid #999', marginRight: '6px'}}></span>*DID Resolvement Protocols* - Handle findability and resolution of Decentralized Identifiers (DIDs)  

<span style={{display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#ffe7cd', border: '1px solid #999', marginRight: '6px'}}></span>*Verifiable Presentation Protocol* - Manage trust establishment and verification  

<span style={{display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#c8e6c8', border: '1px solid #999', marginRight: '6px'}}></span>*Data Space Protocols* - Coordinate Eclipse DSP interactions

<span style={{display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#fff2b3', border: '1px solid #999', marginRight: '6px'}}></span>*Data Exchange Protocols* - Execute secure data transfers

<span style={{display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#ffb3b3', border: '1px solid #999', marginRight: '6px'}}></span>*Internal Protocols* - Enable coordination between TSG components

This layered approach ensures that identity management, trust establishment, protocol coordination, and data exchange are handled by specialized components while maintaining seamless integration across the entire system.

## Core Components

### Control Plane
The **Control Plane** acts as the orchestration layer for all data space interactions, implementing the Eclipse Dataspace Protocol (DSP) and coordinating between the Wallet and Data Planes. It handles the complex negotiations and protocols required for secure data exchange in decentralized environments.

This component manages contract negotiation, policy enforcement, and registry interactions, ensuring that all data transfers comply with agreed-upon terms and conditions. The Control Plane translates high-level data space operations into specific actions for the underlying components, maintaining the state of ongoing negotiations and transfers while enforcing organizational policies and access controls.

### Wallet
The **Wallet** is a Self-Sovereign Identity (SSI) wallet that serves as the foundation for digital identity management within data spaces. It handles Decentralized Identifiers (DIDs), Verifiable Credentials (VCs), and Verifiable Presentations (VPs), providing the cryptographic infrastructure necessary for secure, verifiable interactions.

The Wallet's primary responsibility is managing the complete identity lifecycle for data space participants. This includes generating and maintaining cryptographic keys, issuing and storing credentials, and creating presentations for authentication and authorization. It establishes trust relationships with other participants through cryptographic verification and implements the credential exchange protocols that enable secure data space interactions.

### Data Planes
TSG supports multiple data plane implementations, each optimized for specific use cases and data exchange patterns. This modular approach allows organizations to choose the most appropriate data transfer mechanism for their requirements while maintaining consistent integration with the Control Plane.

The **HTTP Data Plane** provides general-purpose data exchange capabilities using standard HTTP protocols. It's designed for scenarios involving file transfers, API-based data exchange, and streaming data, making it suitable for most traditional data sharing use cases. The implementation supports various data formats and includes optimizations for large file transfers and real-time data streams.

The **Analytics Data Plane** enables privacy-preserving distributed analytics and computation across multiple parties without requiring direct data sharing. This specialized implementation supports multi-party computation, federated learning, and other advanced analytics scenarios where data privacy and computational efficiency are critical requirements.

### SSO Bridge
The **SSO Bridge** provides complete authentication and authorization services for the entire TSG ecosystem. It implements OAuth 2.0 and OpenID Connect protocols, enabling secure integration with external identity providers while managing sessions and access controls across all TSG components.

## Component Interactions

### Data Exchange Flow
The typical data exchange process begins when a user authenticates through the SSO Bridge, establishing their session and obtaining the necessary tokens for component access. The Wallet then provides the participant's identity and credentials, which are essential for establishing trust with other data space participants.

During the discovery phase, the Control Plane identifies available data and services within the data space ecosystem. This is followed by contract negotiation, where terms and conditions for data access are established between participants. The Wallet plays a crucial role by providing the necessary credentials to authorize access to specific resources.

Once agreements are in place, the Data Plane executes the actual secure data exchange according to the negotiated terms. Throughout this process, the Wallet continues to verify the integrity and authenticity of received data, ensuring that all exchanges meet the established trust requirements.

### Trust Establishment
Trust establishment in TSG follows a decentralized model where participants verify each other's identities through cryptographic means. The process begins with DID resolution, where participants discover and verify each other's DID documents to establish cryptographic identities.

Credential verification follows, with Wallets examining and validating the verifiable credentials presented by other participants. This verification process includes checking cryptographic signatures, expiration dates, and revocation status. Policy evaluation occurs at the Control Plane level, where access policies are assessed against the verified credentials to determine authorization levels.

Finally, secure communication channels are established between Data Planes using the verified identities and authorization levels. This ensures that all subsequent data exchanges occur within the established trust framework and comply with the negotiated policies.

## Deployment Architecture

TSG components are designed with flexibility in mind, supporting various deployment configurations to meet different organizational needs and technical requirements.

**Single Participant Deployment** is the most common configuration, where all components are deployed for one organization joining an existing data space ecosystem. This setup provides a complete TSG installation that can immediately participate in data space activities while connecting to other established participants.

**Ecosystem Deployment** involves setting up multiple participant instances along with authority and trust anchor services. This configuration is ideal for organizations that want to operate their own data space or create testing environments that simulate real-world data space interactions with multiple participants.

---

**Next**: Learn about [Components](./components.md) for detailed component breakdown, or [Standards and Protocols](./standards-protocols.md) for technical specifications.
