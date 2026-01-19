# TSG Playground

The TSG Playground is a live demonstration dataspace where you can explore and test the TNO Security Gateway components without deploying your own infrastructure. It provides a hands-on environment to understand how dataspaces work and experience the complete lifecycle of data exchange.

## What is the Playground?

The playground is a fully operational dataspace with:
- Authority Wallet: Central credential issuer for the playground dataspace
- Three Participants: Alice, Bob, and Charlie, each with complete TSG stacks
- Pre-configured Datasets: Test datasets ready for immediate use
- Automatic Workflows: Negotiations are auto-accepted to speed up testing

### Purpose and Use Cases

Use the playground to:
- Learn dataspace concepts and TSG architecture
- Test catalog browsing, contract negotiation, and data transfer
- Demonstrate TSG capabilities to stakeholders
- Test integration before deploying your own participant

## Quick Access

### Credentials

All playground components use the same credentials:
- Username: `playground`
- Password: `test`

Note: These are shared demo credentials. Do not use the playground for sensitive or production data.

### Component URLs

#### Authority
- [Dataspace Authority Wallet](https://playground.datapac.es/wallet) - Central credential issuer

#### Alice
- [Alice Wallet](https://alice.playground.dataspac.es/wallet) - Credential management
- [Alice Control Plane](https://alice.playground.dataspac.es/control-plane) - Catalog & negotiations
- [Alice HTTP Data Plane](https://alice.playground.dataspac.es/http-data-plane) - Data access

#### Bob
- [Bob Wallet](https://bob.playground.dataspac.es/wallet) - Credential management
- [Bob Control Plane](https://bob.playground.dataspac.es/control-plane) - Catalog & negotiations
- [Bob HTTP Data Plane](https://bob.playground.dataspac.es/http-data-plane) - Data access

#### Charlie
- [Charlie Wallet](https://charlie.playground.dataspac.es/wallet) - Credential management
- [Charlie Control Plane](https://charlie.playground.dataspac.es/control-plane) - Catalog & negotiations
- [Charlie HTTP Data Plane](https://charlie.playground.dataspac.es/http-data-plane) - Data access

## Understanding Components

### Wallet
- Manages identity using Self-Sovereign Identity (SSI)
- Stores Verifiable Credentials issued by the Authority
- Proves participant membership in the dataspace

### Control Plane
- Implements the Dataspace Protocol
- Manages catalogs, negotiations, and transfers
- Coordinates with other participants

### HTTP Data Plane
- Executes actual data transfers
- Proxies requests to backend services
- Enforces transfer agreements

## Getting Started

Follow this tutorial to experience a complete data exchange flow in the playground.

### Step 1: Access a Participant

1. Choose a participant (e.g., Alice) and navigate to their Control Plane
2. Log in with the credentials: `playground` / `test`
3. The main dashboard appears with a navigation menu on the left

### Step 2: Discover Other Participants

1. In the left menu, click Registry → Addresses
2. Entries for Bob and Charlie appear, along with any other deployed participants
3. Click on Bob to view his entry
4. Click Request Catalog to fetch Bob's available datasets
5. Wait while the catalog is retrieved

The catalog shows all datasets Bob is willing to share, along with their access policies.

### Step 3: Browse the Catalog

1. After requesting the catalog, click Catalogs in the left menu
2. Find and click on Bob's catalog entry
3. Bob's dataset appears: "Bob HTTPBin"
4. Click the info icon on the dataset entry to see details

The dataset information shows:
- Title: Bob HTTPBin (0.9.2)
- Conforms to: HTTPBin OpenAPI specification
- Policy: Always Allow (unrestricted access)
- Distribution: API endpoint details

### Step 4: Negotiate a Contract

1. From the dataset details, click Negotiate Contract
2. The system creates a contract negotiation request
3. Since contract negotiations are automated, all steps will happen automatically

This establishes a formal agreement to access Bob's dataset according to the policy terms.

### Step 5: View Negotiation History

1. Click Negotiation History in the left menu
2. Find your completed negotiation with Bob
3. Click on the negotiation to view details
4. Click Request Transfer

This creates a data transfer agreement based on your contract.

### Step 6: Monitor the Transfer

1. Click Transfers in the left menu
2. Your active transfer with Bob appears
3. The transfer shows status: Active

> Keep the transfer active. Do not complete, suspend, or stop it as you need it for data access.

### Step 7: Access the Data

You can now retrieve data from Bob's HTTPBin service:

1. Navigate to Alice's HTTP Data Plane (use the URL from Quick Access section)
2. Log in with `playground` / `test`
3. Click Execute in the Quick Actions menu
4. In the request form:
   - Method: GET
   - Path: `/anything`
   - Headers: (leave default)
   - Body: (empty for GET)
5. Click Send Request

A successful response appears:
```json
{
  "args": {},
  "headers": {...},
  "method": "GET",
  "origin": "...",
  "url": "..."
}
```

You have completed a full data exchange cycle.

## Available Datasets

All three participants (Alice, Bob, Charlie) offer the same dataset for testing:

### HTTPBin Test Service

Description: A request & response testing service that echoes back whatever you send it.

Policy: Always Allow (no restrictions)

Available Endpoints:
- `/anything` - Returns anything that is passed via request
- `/get` - Returns GET request data
- `/post` - Returns POST request data
- `/put` - Returns PUT request data
- `/delete` - Returns DELETE request data
- `/headers` - Returns request headers
- `/ip` - Returns origin IP
- `/user-agent` - Returns user-agent string
- `/status/{code}` - Returns specified HTTP status code

Example: Send a POST request to `/post` with a JSON body:
```json
{
  "message": "Hello from the playground!",
  "timestamp": "2025-11-06"
}
```

The response will echo back your message with a 200 status, plus metadata about the request.

## Common Workflows

### Workflow: Test Different HTTP Methods

1. Establish a transfer (follow Steps 1-6 above)
2. Go to the Data Plane and try different operations:
   - GET `/get` - Retrieve data
   - POST `/post` with JSON body - Send data
   - PUT `/put` with JSON body - Update data
   - DELETE `/delete` - Delete operation

### Workflow: Explore the Control Plane

1. Dashboards: View statistics and recent activity
2. Registry: Manage known participants and request catalogs
3. Catalogs: Browse available datasets
4. Negotiation History: Review completed contracts
5. Transfers: Monitor active data exchanges

### Workflow: Understand Credentials

1. Log into a participant's Wallet (not Control Plane)
2. View the stored Verifiable Credential
3. See the credential subject details (role, participant info)
4. Understand how identity works in the dataspace

## Troubleshooting

### Cannot Log In
Login fails with incorrect credentials.

Check that you're using `playground` / `test` (all lowercase). Try a different browser or clear cookies.

### Negotiation Not Appearing
After negotiating, nothing appears in Negotiations.

Wait 5-10 seconds and refresh the page. Check the Negotiations page to confirm the negotiation was created.

### Cannot Send Data Plane Request
Data plane shows "No active transfer" or similar error.

Verify you have an Active transfer in Control Plane → Transfers. Ensure the transfer is not Completed, Suspended, or Stopped.

### Response Shows Error
Data plane request returns an error.

Check the endpoint path is correct (e.g., `/anything`, not `anything`). Verify the HTTP method matches the endpoint (GET for `/get`, POST for `/post`).

### Page Won't Load
Participant URLs don't load.

Verify the URL is correct (check for typos in subdomain). The playground may be under maintenance.

## Next Steps

### Deploy Your Own Participant

To join the playground with your own deployed participant, see the [Deployment Guide](./deployment.md) for instructions on:
- Deploying your own TSG components on Kubernetes
- Requesting credentials from the Authority Wallet
- Interacting with Alice, Bob, and Charlie from your own infrastructure

### Learn More About TSG

- [Getting Started Guide](../getting-started.md) - Complete TSG setup and configuration
- [Architecture Overview](../architecture/) - TSG design and components
- [Deployment Documentation](../deployment/) - Production deployment strategies
- [CLI Tool Guide](../tools/cli/) - Advanced deployment and management

### Explore Advanced Features

- [Analytics Data Plane](../apps/analytics-data-plane/) - Distributed analytics capabilities
- [Custom Data Planes](../apps/) - Build your own data plane connectors

## Feedback and Support

Found an issue or have suggestions?

- [Report Issues](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/issues) - Bug reports and feature requests
- [TSG Documentation](https://tsg.dataspac.es) - Complete documentation website