---
sidebar_position: 5
---

# Signing And Validation

`common-signing-and-validation` provides reusable cryptographic and trust-evaluation building blocks for TSG applications. It is used when an application needs to sign data, verify credentials or presentations, resolve DIDs, validate proofs, or evaluate whether a credential chain is trustworthy enough for the next business step.

## What The Library Does

The library groups together functionality that would otherwise be easy to duplicate incorrectly across applications:

- signing JWTs and JWS payloads
- generating W3C Data Integrity proofs
- validating credentials, presentations, JWTs, JWS payloads, and proof material
- resolving DIDs through shared strategies
- applying trust-anchor and status checks during verification
- validating field-level and DCQL-related constraints

This library does not decide authorization on its own. Instead, it usually runs before or alongside an authorization or business decision.

## Signing Support

The shared signing helpers support a few common patterns:

- `signAsJws` for low-level detached-style signing work
- `generateSignedJwt` for JWT creation with common claims such as audience, expiry, issuer, subject, and nonce
- `generateSignedDataIntegrityProof` for W3C Data Integrity proof generation

This makes it possible to standardize how credentials, presentations, and protocol payloads are signed across applications.

Example:

```typescript
const jwt = await generateSignedJwt(payload, didId, {
  key: {
    id: 'assertion',
    signingKey: privateJwk,
    algorithm: 'EdDSA'
  },
  audience: 'control-plane',
  expiresIn: 300,
  iss: true,
  subject: true
});
```

## Verification Support

The verification exports cover the main credential and token checks used in TSG:

- JWT validation
- JWS verification
- credential validity checks
- credential-status checks
- presentation validation
- proof validation
- field and constraint validation

In practice, these functions answer questions such as:

- is the token structurally valid and correctly signed?
- is the presentation intended for this audience?
- is the credential still valid and not revoked?
- does the proof match the claimed issuer and cryptographic suite?
- do the credential contents satisfy the requested constraints?

## DID Resolution

The library exports shared DID resolver support and resolver strategies for the DID methods currently used in the platform, including key, web, and tdw-based resolution paths.

That keeps DID lookup and verification logic consistent across applications that consume credentials or verify proof material.
