---
toc_max_heading_level: 2
---
# Design Decisions

This document outlines key architectural and design decisions made during the development of the TNO Security Gateway, along with the rationale and trade-offs considered.

## 1. Kubernetes-Native Deployment

### Decision
Design components for Kubernetes deployment with Helm charts and cloud-native patterns.

### Rationale
Kubernetes provides a robust, scalable platform that enables both horizontal and vertical scaling of TSG components based on actual demand patterns. The built-in health checks, automatic restarts, and load balancing capabilities ensure high availability and resilience against component failures. This approach aligns with modern cloud-native principles and provides consistent deployment patterns across different environments.

The container orchestration capabilities of Kubernetes enable TSG to run consistently across different cloud providers and on-premises environments, avoiding vendor lock-in while leveraging the best features of each platform. The rich ecosystem of monitoring, logging, and management tools available in the Kubernetes ecosystem provides extensive operational visibility and control.

Kubernetes security features including network policies, role-based access control (RBAC), and integrated secret management provide defense-in-depth security for TSG deployments. These capabilities are essential for data space scenarios where security and compliance requirements are paramount.

### Trade-offs
Kubernetes introduces significant complexity in deployment and operations, requiring specialized knowledge and expertise to manage effectively. The learning curve can be steep for teams new to container orchestration, potentially slowing initial deployment and requiring investment in training and tooling.

The platform itself requires substantial computational resources, which may impact cost-effectiveness for smaller deployments. Additionally, some cloud provider-specific features may create dependencies that could limit portability, though careful design can minimize these concerns.

### Implementation
Helm charts provide standardized deployment and configuration management across all TSG components, enabling consistent deployment patterns and easy customization for different environments. Health check endpoints are implemented in all components to support Kubernetes probes for automated health monitoring and recovery.

Graceful shutdown handling ensures zero-downtime deployments and maintenance operations. Configuration management leverages Kubernetes ConfigMaps and Secrets to separate configuration from code while maintaining security for sensitive values.

---

## 2. TypeScript and NestJS Framework

### Decision
All backend components use TypeScript and the NestJS framework as the primary development platform.

### Rationale
TypeScript provides compile-time type checking that significantly reduces runtime errors and improves code quality, particularly important for security-critical components like identity and credential management. The static type system enables better IDE support, refactoring capabilities, and developer productivity while maintaining the flexibility of JavaScript.

NestJS brings enterprise-ready features including dependency injection, extensive testing support, and modular architecture patterns that align well with TSG's component-based design. The framework's decorator-based approach provides clean separation between business logic and infrastructure concerns while maintaining excellent testability.

The consistent technology stack across all components reduces complexity in development, testing, and operations. Shared libraries and common patterns can be used across components, accelerating development and ensuring consistency in implementation approaches.

### Trade-offs
Teams need to invest in learning TypeScript and NestJS patterns, which may require training and adjustment periods. The framework introduces some runtime overhead compared to minimal implementations, though this is generally negligible for I/O-intensive operations common in data space scenarios.

The decision creates dependency on the Node.js and NestJS ecosystems, requiring careful consideration of library choices and upgrade paths. However, the rich ecosystem and active community generally outweigh these concerns.

### Implementation
Strict TypeScript configuration ensures thorough type checking across all components. NestJS decorators provide clean API definitions and dependency injection patterns. Shared libraries implement common functionality, while Jest provides extensive unit and integration testing capabilities.

---

## 3. Standards-First Approach

### Decision
TSG implements existing industry standards (W3C DIDs/VCs, Eclipse DSP, Eclipse DCP, OID4VC) rather than creating custom protocols for data space operations.

### Rationale
Building on established standards ensures interoperability with other data space implementations and tooling, enabling TSG to participate in broader data space ecosystems without requiring custom integration work. These standards have undergone extensive peer review and testing in production environments, providing better security and reliability than custom protocols could achieve.

The standards-based approach allows TSG to leverage existing tools, libraries, and developer expertise, reducing implementation complexity and accelerating development. It also provides confidence to adopters that TSG follows recognized best practices and will continue to evolve with industry standards.

Future-proofing is ensured as standards evolve to address new requirements and security challenges. TSG can adopt new versions and extensions of standards without requiring fundamental architectural changes.

### Trade-offs
Standards can be complex to implement correctly, requiring deep understanding of specification details and edge cases. Generic standards may not be optimized for specific use cases, potentially impacting performance compared to custom solutions designed for particular scenarios.

Standards may constrain implementation choices, requiring adaptation of internal designs to conform to external specifications. However, this constraint generally improves long-term maintainability and interoperability.

### Implementation
TSG implements W3C DID and Verifiable Credential specifications for decentralized identity management, along with the Eclipse DCP and OID4VC standards for credential issuance, presentation, and verification workflows. The platform provides compliance with Eclipse DSP for standardized data space communication, contract negotiation, and policy enforcement across participants.

---

## 4. SSI-Based Authentication

### Decision
Use Self-Sovereign Identity (SSI) for authentication, enabling users to login with a SSI wallet on their mobile device.

### Rationale
SSI-based authentication aligns with the data space paradigm of decentralized identity and user sovereignty, providing users with complete control over their identity and credentials. This approach eliminates the need for centralized identity providers while ensuring strong cryptographic security through verifiable credentials.

The integration with mobile wallets provides a user-friendly authentication experience while maintaining the highest security standards. Users can authenticate using their preferred SSI wallet application, which manages their private keys securely on their device. This approach supports multiple wallet implementations and follows W3C standards for maximum interoperability.

SSI authentication enables rich attribute-based access control through verifiable credentials, allowing fine-grained authorization based on user attributes, organizational memberships, or other verified claims. This capability is essential for data space scenarios where access decisions must be based on complex business relationships and trust frameworks.

### Trade-offs
SSI authentication requires users to have a compatible wallet application installed on their device, which may create adoption barriers for some user populations. The technology is newer than traditional authentication methods, requiring education and support for users unfamiliar with SSI concepts.

The decentralized nature of SSI means that credential revocation and status checking require additional infrastructure compared to centralized systems. However, these challenges are addressed through emerging standards and best practices in the SSI community.

Normal user-based login with OAuth 2.0 / OpenID Connect is still supported. For use cases where traditional authentication is preferred or required, the TSG provides the SSO-Bridge that allows to seamlessly integrate user/system authentication in the different applications.

### Implementation
TSG integrates with the [TSG Mobile Wallet](https://gitlab.com/tno-tsg/dataspace-protocol/personal-wallet/mobile-wallet), an external repository containing a complete SSI wallet implementation for mobile devices. The wallet supports W3C DID and Verifiable Credential standards, providing secure key management and credential storage.

Authentication flows use standard SSI protocols including DID authentication and verifiable presentation exchanges. The system supports multiple wallet implementations through standardized interfaces, ensuring users can choose their preferred wallet application while maintaining security and interoperability.

---

## 5. Multi-Component Architecture

### Decision
TSG functionality is split into separate, loosely-coupled components (Wallet, Control Plane, Data Planes, SSO Bridge) rather than implemented as a monolithic application.

### Rationale
This architectural approach provides clear separation of concerns, with each component having focused responsibilities that align with specific domain expertise. The separation enables independent scaling of components based on actual load patterns, allowing organizations to optimize resource usage and performance. Different components can leverage the most appropriate technologies for their specific requirements, from cryptographic libraries for the Wallet to high-performance data transfer mechanisms for Data Planes.

The architecture supports flexible deployment patterns, enabling components to be distributed across different environments based on security requirements, compliance needs, or organizational policies. This flexibility is particularly valuable in enterprise environments where different components may need to operate in different security zones or geographic locations.

From a development perspective, the multi-component approach enables teams to work independently on different aspects of the system while maintaining clear interfaces and contracts between components. This accelerates development and reduces the complexity of testing and maintenance.

### Trade-offs
The distributed architecture introduces additional complexity in deployment and configuration management, requiring sophisticated orchestration and monitoring capabilities. Network communication between components adds latency compared to in-process communication, though this is typically minimal in properly designed systems.

Data consistency across components requires careful design and implementation of eventual consistency patterns, as traditional ACID transactions cannot span component boundaries. This complexity is managed through well-defined APIs and clear ownership of data domains.

### Implementation
Components communicate through REST APIs with OAuth-based authentication, providing secure and standardized integration patterns. Each component maintains its own database following the database-per-component pattern, ensuring clear data ownership and enabling independent scaling. Event-driven communication handles asynchronous operations where immediate consistency is not required.

---

## 6. Configuration Management

### Decision
Use environment-based configuration with validation and runtime updates.

### Rationale
Environment-based configuration ensures that the same code artifacts can be deployed consistently across all environments, from development through production, eliminating configuration drift and deployment inconsistencies. This approach separates configuration concerns from application logic, enabling different deployment scenarios without code changes.

Security is enhanced by storing sensitive configuration values in dedicated secure systems rather than embedding them in code or configuration files. The validation framework catches configuration errors early in the deployment process, preventing runtime failures and reducing debugging complexity in production environments.

The flexibility to change configuration without requiring code changes accelerates operational responses to changing requirements and enables fine-tuning of system behavior in production. Auto-generated configuration documentation ensures that operational teams understand available configuration options and their impacts.

### Trade-offs
Environment-based configuration introduces additional complexity in the configuration management system, requiring coordination between development and operations teams to ensure proper configuration deployment. Some configuration errors may only be detected at runtime despite validation efforts, particularly for dynamic or environment-specific values.

Security considerations become more complex as configuration values must be protected throughout their lifecycle, from initial creation through deployment and runtime access. This requires careful design of access controls and audit capabilities.

### Implementation
Environment variables provide the primary configuration interface, with thorough validation schemas ensuring correctness and completeness. Integration with Kubernetes ConfigMaps and Secrets enables secure and manageable configuration deployment in containerized environments.

Auto-generated configuration documentation maintains up-to-date reference materials for operational teams. Runtime configuration validation and error reporting provide immediate feedback when configuration issues arise, enabling rapid diagnosis and resolution.

---

## 7. Multi-Data Plane Architecture

### Decision
Support multiple data plane implementations (HTTP, Analytics) rather than a single, generic data plane.

### Rationale
Different data exchange scenarios have fundamentally different requirements for performance, protocols, and compliance. Specialized data plane implementations can be optimized for their specific use cases, providing significantly better performance and functionality than a generic solution attempting to serve all scenarios.

The HTTP data plane focuses on RESTful API patterns and standard web protocols, providing excellent integration with existing web-based systems and applications. The Analytics data plane is optimized for privacy-enhanced data processing, supporting specialized protocols and data formats common in analytics workflows.

This architectural approach enables the independent evolution of data plane capabilities. New data plane implementations can be added to support emerging protocols or specialized requirements without affecting existing deployments. Each data plane can also meet different compliance requirements, enabling TSG to support diverse regulatory environments.

### Trade-offs
Multiple data plane implementations increase the overall complexity of the system, requiring more components to develop, test, and maintain. Some functionality may be duplicated across different data plane implementations, though shared libraries help minimize this duplication.

The Control Plane must coordinate with multiple data plane types, requiring more sophisticated routing and management logic. This complexity is managed through well-defined interfaces and consistent patterns across all data plane implementations.

### Implementation
A common data plane interface ensures consistent integration patterns between the Control Plane and all data plane implementations. Shared libraries provide common functionality across data planes, reducing duplication and ensuring consistent behavior.

Plugin architecture enables extending data plane capabilities without modifying core components. Configuration-driven data plane selection allows deployments to choose the appropriate data planes for their specific requirements while maintaining operational simplicity.

---

## 8. Open Source and Extensibility

### Decision
Design TSG as an open-source, extensible platform with clear extension points.

### Rationale
Open source development enables community contributions and widespread adoption, fostering innovation and ensuring that TSG benefits from diverse perspectives and use cases. The transparent nature of open source allows security and functionality to be audited by anyone, building trust and confidence in the platform through peer review and community validation.

Extensibility ensures that organizations can adapt TSG to their specific requirements without requiring changes to the core platform. This capability is essential for data space scenarios where business requirements and technical constraints vary significantly across different organizations and industries.

The open source approach drives innovation through community contributions, enabling rapid development of new features and capabilities that benefit all users. It also ensures vendor independence, preventing lock-in and enabling organizations to maintain control over their data space infrastructure.

### Trade-offs
Open source development requires a community support model rather than traditional vendor support, which may create challenges for organizations requiring guaranteed response times or specialized assistance. The public visibility of vulnerabilities in open source software requires careful coordination of security patches and disclosure processes.

Community contributions require review and maintenance by the core development team, creating ongoing responsibilities for code quality and architectural consistency. However, active community engagement generally provides more value than these costs.

### Implementation
Plugin architecture provides well-defined extension points for adding new functionality without modifying core components. Extensive APIs enable integration with external systems while maintaining clear boundaries and contracts.

Extensive documentation supports developers in understanding and extending TSG capabilities. Contribution guidelines and code review processes ensure that community contributions maintain quality standards and architectural consistency while encouraging broad participation.

---

**Next**: Return to [System Overview](./system-overview.md) or explore [Standards and Protocols](./standards-protocols.md).
