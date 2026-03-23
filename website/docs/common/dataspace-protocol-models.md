---
sidebar_position: 6
---

# Dataspace Protocol Models

`common-dsp` provides the shared protocol vocabulary used by the higher-level common libraries and several applications. It is the place where TSG keeps reusable Dataspace Protocol models, SSI-related models, JSON-LD support utilities, and serialization helpers.

## What The Library Does

The library exports:

- DSP models used for protocol messages and transfer-related payloads
- data-plane model types
- SSI-related models
- JSON-LD context defaults and document-loader helpers
- serialization and deserialization utilities
- protocol version helpers

These shared models keep payload formats consistent across APIs, clients, signing flows, and protocol handling code.

## Why This Matters

Without a shared protocol-model library, each application would need to hand-roll message classes, serialization logic, and JSON-LD handling. That creates drift quickly, especially when several services need to exchange the same kinds of protocol messages.

By using `common-dsp`:

- transfer controllers and clients share the same DTOs
- signing and proof code can rely on a common model vocabulary
- protocol payloads stay easier to evolve consistently across the monorepo

## Typical Uses

You will usually touch this library when you are:

- adding or consuming Dataspace Protocol messages
- implementing transfer-related endpoints or clients
- serializing or deserializing protocol payloads
- working with SSI-related model objects that need to stay aligned across services
- dealing with JSON-LD contexts or document loading in protocol flows
