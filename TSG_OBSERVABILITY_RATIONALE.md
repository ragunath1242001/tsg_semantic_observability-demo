# Why We Chose TSG for the Observability Framework

## 1. Purpose of This Document

This document explains why we chose the TNO Security Gateway, or TSG, as the main place to implement our semantic observability framework instead of starting with the Knowledge Engine.

## 2. What We Want to Observe

Our observability framework is meant to show how semantic interoperability behaves in a real dataspace system.

In simple terms, we want to answer questions such as:

- Are datasets described with enough semantic metadata?
- Are semantic models and schemas actually being used?
- Where do validation problems happen?
- Are policies blocking transfers?
- Do negotiations and transfers succeed or fail?
- Which semantic artefacts are used over time?
- Is the dataspace becoming more stable and interoperable?

To answer these questions, we need to observe real system events during catalog publication, negotiation, policy evaluation, and data transfer.

## 3. Why TSG Is the Better Place to Start

TSG is the better implementation target because it is directly involved in the operational dataspace workflows.

TSG handles:

- Dataset catalog management
- Dataspace protocol interactions
- Contract negotiations
- Policy evaluation
- Transfer processes
- HTTP data-plane access
- Management APIs and user interfaces

These are exactly the points where semantic interoperability can succeed or fail.

Because TSG already manages these workflows, it gives us access to real runtime signals. This makes it possible to collect meaningful observability data without building a separate artificial environment.

## 4. Why Not Start with the Knowledge Engine

The Knowledge Engine is important, but it is not the best first place to implement this observability framework.

The main reason is that the Knowledge Engine is more focused on knowledge representation, reasoning, and semantic processing. It is closer to the semantic logic layer.

However, our observability framework needs to monitor how semantics behave inside a running dataspace system.

For example, we need to see:

- Whether a dataset with semantic metadata is published
- Whether another participant can discover it
- Whether negotiation succeeds
- Whether policies allow or deny access
- Whether the transfer completes
- Whether validation errors occur during actual usage

These events happen inside TSG workflows, not only inside the Knowledge Engine.

So instead of observing semantics only at the knowledge-processing layer, we chose to observe semantics where they affect real dataspace operations.

## 5. Main Reason for Choosing TSG

The main reason is practical value.

TSG gives us real operational evidence.

The Knowledge Engine can tell us about semantic reasoning, but TSG can tell us whether semantics are actually working in a dataspace transaction.

That makes TSG a stronger starting point for observability.

## 6. How We Are Implementing It

We are implementing the framework as a semantic observability layer inside TSG.

This layer records important semantic events from both:

- The Control Plane
- The HTTP Data Plane

The Control Plane is responsible for catalog, negotiation, transfer, and policy workflows.

The HTTP Data Plane is responsible for dataset access and actual data exchange.

By observing both parts, we can understand the full path from dataset publication to data transfer.

## 7. What We Added

We added a shared semantic observability library.

This library defines:

- What a semantic observability event looks like
- Which event types exist
- Which metrics should be calculated
- How sensitive identifiers should be pseudonymized
- How reports and metric snapshots are generated

We then connected this shared library to the TSG Control Plane and HTTP Data Plane.

## 8. What We Record

The framework records events such as:

- Dataset metadata being created or updated
- Semantic artefacts being used
- Metadata validation results
- Policy evaluation results
- Negotiation state changes
- Transfer state changes
- Data-plane access attempts
- Data-plane access failures

These events are stored so they can be analyzed later.

## 9. What Metrics We Produce

The events are converted into understandable metrics.

The metrics are grouped into four areas.

### Adoption

This shows whether semantic models, schemas, and metadata are being used.

Example metrics:

- Semantic model coverage
- Schema reference coverage
- Metadata completeness score

### Friction

This shows where problems happen.

Example metrics:

- Validation error rate
- Policy failure count
- Negotiation failure rate
- Transfer failure rate

### Evolution

This shows how semantic artefacts change over time.

Example metrics:

- Artefact version adoption rate
- Deprecated artefact usage rate

### Stability

This shows whether dataspace operations are reliable.

Example metrics:

- Negotiation success rate
- Transfer success rate
- Average transfer setup latency

## 10. How the Data Is Presented

We added a dashboard to the TSG user interfaces.

The dashboard allows users to:

- View semantic observability metrics
- Filter by time, participant, dataset, artefact, and metric
- Refresh metric snapshots
- See whether automatic refresh is running
- Inspect raw semantic observability events

This makes the observability framework usable by operators, developers, and supervisors.

## 11. Why This Approach Is Useful

This approach is useful because it connects semantic quality to real system behavior.

Instead of only checking whether semantic models exist, we can check whether they help the dataspace work better.

For example, we can see:

- If better metadata leads to fewer validation errors
- If policy failures are blocking data usage
- If semantic artefacts are actually adopted
- If transfers are more successful over time

This gives evidence that can be used for evaluation, reporting, and future improvement.

## 12. Relationship with the Knowledge Engine

Choosing TSG does not mean the Knowledge Engine is unimportant.

The Knowledge Engine can still be useful later as a source of deeper semantic reasoning and semantic validation.

However, TSG is the better first implementation point because it observes the complete operational flow.

A future version of the framework can connect Knowledge Engine insights with TSG runtime observability.

In that setup:

- The Knowledge Engine can provide deeper semantic reasoning.
- TSG can show how those semantics perform during real dataspace operations.

Together, they can provide a stronger observability solution.

## 13. Simple Summary

We chose TSG because it is where real dataspace activity happens.

TSG handles catalog publication, negotiation, policies, transfers, and data access. These are the workflows where semantic interoperability must prove that it works.

The Knowledge Engine is useful for semantic reasoning, but it does not give the same direct view of operational dataspace behavior.

By implementing the observability framework in TSG first, we can measure real semantic adoption, quality, friction, evolution, and stability.

