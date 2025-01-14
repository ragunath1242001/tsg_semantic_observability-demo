# Process View

The following processes are further detailed on this page:

- Authentication flow
- Issuance flow
- Direct Presentation flow
- DCP Presentation flow

## Authentication flow

The authentication flows are either between the wallet and the UI or the wallet and an external system within the same security domain of the wallet.

### Frontend

```mermaid
---
config:
  sequence:
    showSequenceNumbers: true
---
sequenceDiagram
  box Green Wallet
    participant b as Backend
    participant f as Frontend
  end
  actor a as End-user
  participant idp as Identity Provider
  a ->> f: Request page
  f ->> b: [/auth/user]
  b ->> b: Check session status
  b -->> f: User status
  alt is unauthenticated
    f -->> a: Redirect [/auth/login]
    a ->> b: Login
    b ->> idp: Login redirect
    a ->> idp: Login
    idp ->> b: Logged in redirect
    b ->> b: Create session
    b ->> f: Redirect
  end
```

### External system

```mermaid
---
config:
  sequence:
    showSequenceNumbers: true
---
sequenceDiagram
  box Green Wallet
    participant b as Backend
  end
  participant s as External System
  participant idp as Identity Provider
  s ->> idp: Request access token
  idp -->> s: Access Token
  s ->> b: Request resource with Access Token
  b ->> idp: Introspect Access Token
  idp -->> b: Introspection result
  b -->> s: Resource
```

## Verifiable Presentation verification flow

```mermaid
---
config:
  sequence:
    showSequenceNumbers: true
---
sequenceDiagram

  box Green Holder
    participant hw as Wallet
  end
  box Green Verifier
    participant vw as Wallet
  end
  participant i as Issuer

  vw ->> vw: Parse Verifiable Presentation
  vw ->> hw: Retrieve DID document
  hw -->> vw: DID Document
  vw ->> vw: Verify JWT signature
  vw ->> vw: Validate JWT audience
  vw ->> vw: Validate JWT expiration and not before
  loop for all credentials in VP
    vw ->> vw: Parse credential issuer
    vw ->> i: Retrieve DID document
    i -->> vw: DID document
    vw -> vw: Validate credential signature
  end
```

## Issuance flow

This flow describes the process of exchanging a new credential between two Wallet instances

```mermaid
---
config:
  sequence:
    showSequenceNumbers: true
---
sequenceDiagram
  actor ia as Issuer User
  box Green Issuer
    participant iw as Wallet
  end
  box Green Holder
    participant hw as Wallet
  end
  actor ha as Holder User

  ia ->> iw: Create credential offer
  iw ->> iw: Generate offer and pre-authorization_code
  iw -->> ia: Credential Offer
  ia --> ha: Issuer URL & pre-authorization_code [offline]
  ha ->> hw: Request credential
  hw ->> iw: Request Issuer Metadata
  iw -->> hw: Issuer Metadata
  hw ->> iw: Request AccessToken with pre-authorization_code
  iw -->> hw: Access Token
  hw ->> iw: Request Credential
  iw -->> hw: Credential Response
  note over hw: Validate Presentation
```

## Presentation Protocol(s)

Different protocols for exchanging Verifiable Presentations between the _holder_ of credentials and the _verifier_ can be used in different scenarios.

Currently three protocols are implemented or are candidates for implementation in the Wallet:

- Direct protocol: a simple protocol for exchaning verifiable presentations
- [Decentralized Trust Protocol](https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol): a protocol based on the Digital Identity Foundations Presentation Exchange specfication
- OpenID 4 Verifiable Presentations: a draft specification from the OpenID foundation (not yet implemented)

### Direct

The direct presentation protocol is a simple flow for presenting a credential to the _verifier_. Where the control plane of the holder decides which credential(s) to include in the verifiable presentation. The full presentation is shared with the verifier via the `Authorization` header.

While this is a simple way of presenting credentials to the verifier, there are some drawbacks to this approach:

- HTTP headers are often limited in size by the HTTP server implementations, resulting in maximum header sizes of 8kb (default for Nginx and Apache).
- No authentication of the verifier is executed in this flow.
- No handles for specifying which credential the verifier needs to approve the request.

> Note: The direct presentation protocol is likely to be deprecated

```mermaid
---
config:
  sequence:
    showSequenceNumbers: true
---
sequenceDiagram
    participant hs as External System
    box green Holder
    participant hw as Wallet
    end
    box green Verifier
    participant vw as Wallet
    end
    participant vs as External System

    hs ->> hw: Request VP JWT
    hw -->> hs: vp_token
    hs ->> vs: Resource Request (with vp_token)
    vs ->> vw: Validate vp_token
    vw ->> vw: Validate Verifiable Presentation
    vw -->> vs: Validation result
    vs -->> hs: Resource response
```

### Decentralized Claims Protocol

The Decentralized Claims Protocol (DCP) defines the flow of requesting and presenting Verifiable Presentations between _verifier_ and _holder_. The protocol is described at [Eclipse Decentralized Claims Protocol](https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol)

The sequence diagram below shows the interactions between the wallets and control planes of the verifier and holder from a perspective of the TSG components. Which also includes the management interfaces that are not part of the DCP itself.

```mermaid
---
config:
  sequence:
    showSequenceNumbers: true
---
sequenceDiagram
    participant hs as External System
    box green Holder
    participant hw as Wallet
    end
    box green Verifier
    participant vw as Wallet
    end
    participant vs as External System

    hs ->> hw: SIOP ID token request<br />(with presentation access token)<br />GET /api/management/dcp/holder/token
    hw -->> hs: id_token
    hs ->> vs: Resource Request (with id_token)
    vs ->> vw: Request authorization<br />(with id_token & credential definition)<br />POST /api/management/dcp/verifier/verify
    vw ->> vw: Validate id_token
    vw ->> vw: Create SIOP ID token (including holder's access_token)
    vw ->> vw: Get CredentialService from Holder DID
    vw ->> hw: Request presentation<br />(with PresentationQueryMessage & id_token)<br />GET /api/dcp/presentations/query
    hw ->> hw: Validate id_token and access token
    hw ->> hw: Find matching credentials and create VP
    hw -->> vw: PresentationResponseMessage
    vw ->> vw: Validate
    vw -->> vs: Validation result
    vs -->> hs: Resource response
```

A more detailed explanation of the steps in the sequence diagram is provided in the list below:

1. Request a Self Issued ID token targeted at the verifier (_audience_) with an automatically generated access token for the verifier to request the presentation, with an optional scope to limit the access to certain credentials.  
   _**Note**_: Scopes are currently accepted but not used.
2. ID token signed with the default key defined in the wallet.
3. Data Space Protocol Request with the `id_token` as `Bearer` token in the `Authorization` header.
4. Verification request with the holder's `id_token` and a presentation definition according the [DIF Presentation Definition specification](https://identity.foundation/presentation-exchange/spec/v2.0.0/#presentation-definition).
5. Validation of the holder's `id_token`, which additionally requires resolvement of the DID document of the holder to retrieve the public key material used to sign the `id_token`.
6. Create a Self Issued ID token targeted at the holder (_audience_) incorporating the access token from the holder's `id_token`.
7. Retrieve the `"CredentialService"` service from the holder's DID document to find the service endpoint for requesting the presentation.
8. Request the presentation at the service endpoint with a DCP `PresentationQueryMessage` and the `id_token` as `Bearer` token in the `Authorization` header.
9. Validate the verifier's `id_token` and the access token inside the `id_token`.
10. Find matching credentials based on the presentation definition and the scope of the access token.
11. Return the Verifiable Presentation in a DCP `PresentationResponseMessage`.
12. Validate the Verifiable Presentation and validate whether it matches the requested presentation definition.
13. Return the Verifiable Presentation when all checks are successful.
14. Response of the original DSP request.
