# TSG Wallet docs

The TSG Wallet is a SSI wallet that can issue and store verifiable credentials and create presentations to be used within data spaces.

The wallet is aimed at multi-tier deployments, with one (or more) wallet that acts as trust anchor for a data space and indivual wallets for each of the participants in the data space. On this page the central wallet that issues credentials will be called the Dataspace Wallet although it is not required that there always is exactly one issuer of credentials in a dataspace.

# Structure

- Architecture
  - [Logical View](./architecture/logical.md)
  - [Process View](./architecture/process.md)
  - [Development View](./architecture/development.md)
  - [Scenarios](./architecture/scenarios.md)
  - [Security perpective](./architecture/security.md)
- [Configuration](./configuration.md)
- [Build process](./build-process.md)
- [Interoperability](./interoperability.md)

# OpenAPI definition

An OpenAPI definition is generated for the wallet, currently the link between the schemas and the actual objects used in the requests/responses are soft. So it is not guaranteed that the OpenAPI specification is 100% correct. In later releases, this will be synchronized together with `class-validator` and `class-transformer` to ensure correctly structures objects are expected/returned.

The specification is located at: [TSG Wallet OpenAPI Specification](./openapi.yaml)

## Design choices

### 1. Leveraging existing standards

Used standards:

- W3C DID [(W3C recommendation)](https://www.w3.org/TR/did-core/)
- did:web [(W3C internal document)](https://w3c-ccg.github.io/did-method-web/)
- JSON Web Signatures for Data Integrity Proofs [(W3C working draft)](https://www.w3.org/TR/vc-jws-2020/)
  - Supported JOSE signing/encryption: Ed25519/EdDSA, P-384/ES384, RSA/PS256
- Verifiable Credentials Data Model v1.1 [(W3C recommendation)](https://www.w3.org/TR/vc-data-model/)

### 2. Programming language & environment

NodeJS & Typescript are chosen as execution and development environment for these reasons:

1. Efficiently deployable in cloud environments; considerably lower memory requirements compared to JVM-based environments
2. Strongly typed development; given the size of the projects a strongly typed programming language is a must for maintainability of the code
3. Easily understandable for new developers; Javascript/Typescript are more easily picked up by developers then for example Rust or Go
4. Ability to share code/models between frontend and backend; since frontend UIs are predominantly written in Javascript/Typescript allows to share interface/classes between frontend and backend, reducing errors

### 3. Limit external dependencies

The requirement on external dependencies should be as low as possible, including only dependencies in case they provide concrete benefits. Reason for this is to keep the Software Bill of Materials as light as possible to recude security risks of these dependencies.

The main dependencies of the backend are:

- [NestJS framework](https://nestjs.com/)
- [Class-transformer](https://github.com/typestack/class-transformer) & [class-validator](https://github.com/typestack/class-validator)
- [Express](https://expressjs.com/)
- [Passport](https://www.passportjs.org/)
- [TypeORM](https://typeorm.io/)
- [JSON Object Signing and Encryption](https://github.com/panva/jose)
- [Axios](https://axios-http.com/docs/intro)

The main dependencies of the frontend are:

- [Vue](https://vuejs.org/)
- [PrimeVue](https://primevue.org/)
- [Axios](https://axios-http.com/docs/intro)
- [MonacoEditor](https://microsoft.github.io/monaco-editor/)
