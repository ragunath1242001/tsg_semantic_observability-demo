# Deploy Your Own Participant to the Playground

This guide walks you through deploying your own TSG participant and connecting it to the TSG Playground dataspace. By deploying your own infrastructure, you'll interact with Alice, Bob, and Charlie from your own participant.

## Overview

What you'll deploy:
- Your own Wallet for credential management
- Your own Control Plane for catalog and negotiation management  
- Your own HTTP Data Plane for data exchange
- All components configured to join the playground dataspace

What you'll learn:
- How to configure TSG for an existing dataspace
- The onboarding process for new participants
- Managing your own datasets and policies
- Operating as an independent participant

## Prerequisites

Before starting, ensure you have:

### Infrastructure Requirements
- Kubernetes cluster (version 1.24 or higher)
- kubectl configured and connected to your cluster
- Helm (version 3.x) installed
- Ingress Controller with public routes (e.g., NGINX Ingress Controller)
- TLS Certificate Management (e.g., cert-manager)
- Public domain pointing to your Kubernetes ingress
- [CloudNativePG](https://cloudnative-pg.io/) available on the cluster, if not present the CLI will help to install
### Tool Requirements
- Node.js (version 22 or higher)
- TSG CLI installed: `npm install -g @tsg-dsp/cli@latest`

New to TSG? Check the [Getting Started Guide](../getting-started.md) for detailed installation instructions.

## Step 1: Request Playground Credentials

Before deploying, you need authorization to join the playground dataspace.

### 1.1 Navigate to Authority Wallet

Go to the [Dataspace Authority Wallet](https://playground.dataspac.es/#/home)

### 1.2 Request Credential Offer

1. Click Request Credential
2. Enter your email address
3. Submit the request

### 1.3 Retrieve Pre-authorized Code

1. Check your email for a message from `noreply@dataspac.es`
2. Click the button in the email to retrieve your code
3. Copy the pre-authorized code - you'll need this for configuration
4. Note the instructions provided for claiming your credential

If you don't receive the email, check your spam folder or wait a few minutes. The email system may have delays.

## Step 2: Configure Your Participant

Create a `participant.yaml` file with your configuration:

```yaml
general:
  namespace: my-playground-participant          # Your Kubernetes namespace
  username: admin                               # Your admin username
  password: "your-secure-password"              # Strong password
  authorityDomain: playground.dataspac.es       # DO NOT CHANGE
  credentialType: PlaygroundCredential          # DO NOT CHANGE

participant:
  host: myorg.org                               # Your domain
  id: myorg                                     # Your organization ID
  name: My Organization                         # Your organization name
  hasControlPlane: true
  issuer: false
  credentialSubject:
    role: playground:Participant                # DO NOT CHANGE
  preAuthorizedCode: YOUR_CODE_FROM_EMAIL       # REQUIRED: Code from Step 1
  dataPlanes:
    http-data-plane:
      type: http-data-plane
      postgres: true
      tsgDataPlane: true
      subPath: http-data-plane
      config:
        dataset:
          type: versioned
          title: My Test Dataset                # Your dataset name
          currentVersion: 1.0.0
          versions:
            - version: 1.0.0
              distributions:
                - backendUrl: https://httpbin.org  # Your API endpoint
                  openApiSpecRef: https://httpbin.org/spec.json
```

### Configuration Guide

Must customize:
- `namespace`: Unique Kubernetes namespace for your deployment
- `username` / `password`: Your admin credentials (store securely)
- `host`: Your domain
- `id`: Unique identifier for your organization
- `name`: Display name for your organization
- `preAuthorizedCode`: Code from Step 1
- `dataset.title`: Name for your shared dataset
- `backendUrl`: API endpoint you want to share (or use httpbin.org for testing)

Do not change:
- `authorityDomain`: Must be `playground.dataspac.es`
- `credentialType`: Must be `PlaygroundCredential`
- `role`: Must be `playground:Participant`

Your `host` must be a domain that resolves to your Kubernetes ingress and has valid TLS certificates.

## Step 3: Bootstrap Configuration

Generate Helm value files from your configuration:

```bash
tsg bootstrap participant -f participant.yaml
```

This creates an `output/` directory containing:
- `wallet-values.yaml` - Wallet configuration
- `control-plane-values.yaml` - Control Plane configuration
- `http-data-plane-values.yaml` - Data Plane configuration

Review the generated files in the `output/` directory to understand what will be deployed.

## Step 4: Deploy to Kubernetes

Deploy your participant to the playground:

```bash
tsg deploy participant -f participant.yaml
```

The CLI will:
1. Create the Kubernetes namespace
2. Deploy Wallet with credential configuration
3. Deploy Control Plane
4. Deploy HTTP Data Plane with your dataset
5. Configure ingress routes for all components

Deployment takes approximately 2-5 minutes depending on your cluster.

### Monitor Deployment Progress

```bash
# Check pod status
kubectl get pods -n my-playground-participant

# Watch pods start up
kubectl get pods -n my-playground-participant -w

# Check ingress configuration
kubectl get ingress -n my-playground-participant
```

Wait until all pods show `Running` status and `READY 1/1`.


## Step 5: Discover Playground Participants

Your participant can now interact with the playground.

### 5.1 Access Your Control Plane

Navigate to: `https://myorg.org/control-plane`

Log in with your admin credentials.

### 5.2 View Registry

1. Click Registry in the left menu
2. Click Addresses tab
3. You should see Alice, Bob, and Charlie listed

The playground participants are pre-configured in the registry for easy access.

### 5.3 Request a Catalog

1. Click on Alice (or Bob/Charlie) in the Addresses list
2. Click Request Catalog
3. Wait a few seconds for the catalog to be fetched

## Step 6: Negotiate Your First Contract

Establish a contract with Alice to access her HTTPBin dataset.

### 6.1 Browse Alice's Catalog

1. Click Catalogs in the left menu
2. Find and click on Alice's catalog
3. The dataset "Alice HTTPBin" appears

### 6.2 View Dataset Details

1. Click the info icon on the Alice HTTPBin dataset
2. Review the dataset information:
   - Title: Alice HTTPBin
   - Policy: Always Allow (unrestricted access)
   - Distribution: API endpoint and specification

### 6.3 Initiate Contract Negotiation

1. Click Negotiate Contract
2. The system creates a negotiation request and sends it to Alice
3. Since contract negotiation is automatic, these steps will happen automatically. Try enabling `manual` contract negotiation in the Settings in the topbar and see what happens!

### 6.4 (If `manual` contract negotiation) Sign the Contract

1. Click Negotiations in the left menu
2. Alice has automatically accepted the negotiation (within seconds)
3. Click Sign to sign the contract on your side
4. Alice automatically signs as well
5. The negotiation status changes to Completed

### 6.5 View Completed Contract

1. Click Negotiation History in the left menu
2. Find your completed negotiation with Alice
3. Click on it to view the full contract details

## Step 7: Request a Data Transfer

With a signed contract, you can now request data transfer:

### 7.1 Initiate Transfer

1. From the negotiation details view (Step 7.5), click Request Transfer
2. The system creates a transfer agreement
3. Navigate to Transfers in the left menu

### 7.2 Verify Active Transfer

You should see your transfer with Alice showing:
- Status: Active
- Participant: Alice
- Dataset: Alice HTTPBin
- Agreement: Your contract reference

Do not complete, suspend, or stop the transfer. You need it active to access data. If you accidentally stop it, repeat Steps 6-7.

## Step 8: Access Data from Alice

You can now retrieve data from Alice's HTTPBin service through your data plane.

### 8.1 Access Your Data Plane

Navigate to: `https://myorg.org/http-data-plane`

Log in with your admin credentials.

### 8.2 Execute Your First Request

1. Click Execute in the Quick Actions menu (middle button)
2. Configure the request:
   - Transfer: Select your active transfer with Alice
   - Method: GET
   - Path: `/anything`
   - Headers: (leave default)
   - Body: (empty for GET requests)
3. Click Send Request

### 8.3 View Response

You should see a successful response:

```json
{
  "args": {},
  "data": "",
  "files": {},
  "form": {},
  "headers": {
    "Accept": "*/*",
    "Host": "httpbin.org",
    ...
  },
  "json": null,
  "method": "GET",
  "origin": "...",
  "url": "https://httpbin.org/anything"
}
```

You have successfully completed your first data exchange as a deployed participant.

## Step 9: Experiment Further

### Try Different Endpoints

HTTPBin provides many testing endpoints:

GET Requests:
```
GET /get                 - Returns GET request data
GET /headers            - Returns request headers only
GET /ip                 - Returns origin IP address
GET /user-agent         - Returns user-agent string
GET /status/200         - Returns specific HTTP status code
```

POST Requests:
```
POST /post              - Returns POST data
  Body: {"message": "Hello from my participant!"}
  
POST /anything          - Returns anything sent
  Body: {"test": "data", "timestamp": "2025-11-06"}
```

Other Methods:
```
PUT /put                - Returns PUT data
DELETE /delete          - Returns DELETE confirmation
PATCH /patch            - Returns PATCH data
```

### Share Your Own Data

Your deployed participant is also offering a dataset (configured in `participant.yaml`):

1. Visit Alice/Bob/Charlie to request your catalog
2. They can negotiate contracts with your participant
3. You'll see incoming negotiations in your Control Plane
4. Negotiations are automatically accepted in the playground

## Understanding Your Deployment


### Data Flow

1. **Discovery**: Your Control Plane requests catalogs from other participants
2. **Negotiation**: Contracts are negotiated via Dataspace Protocol
3. **Authorization**: Wallet credentials prove your identity
4. **Transfer**: Data Plane executes transfers based on contracts
5. **Access**: Backend APIs are accessed through your Data Plane proxy

### What Gets Stored

- Wallet: Verifiable Credentials (persisted)
- Control Plane: Catalogs, negotiations, transfers, contracts (persisted)
- Data Plane: No data storage - passes through to backend
- Backend API: Data storage depends on your backend (HTTPBin doesn't store)

## Troubleshooting

### Deployment Issues

Pods Not Starting

```bash
# Check pod status
kubectl get pods -n my-playground-participant

# View pod logs
kubectl logs <pod-name> -n my-playground-participant

# Describe pod for events
kubectl describe pod <pod-name> -n my-playground-participant
```

Common causes:
- Resource constraints (insufficient CPU/memory)
- Configuration errors (check generated values files)

Ingress Not Working

```bash
# Check ingress configuration
kubectl get ingress -n my-playground-participant
kubectl describe ingress <ingress-name> -n my-playground-participant
```

Common causes:
- DNS not configured correctly
- TLS certificates not issued (check cert-manager)
- Ingress controller not running

### Credential Issues

Cannot Claim Credential

"Invalid pre-authorized code" error:
- Verify you copied the complete code from the email
- Ensure the code hasn't expired (request a new one if needed)
- Check that `authorityDomain` in config is exactly `playground.dataspac.es`

Credential Not Appearing in Wallet

After claiming, no credential shows in wallet:
- Wait 30 seconds and refresh the page
- Check wallet pod logs: `kubectl logs <wallet-pod> -n <namespace>`
- Verify network connectivity to `playground.dataspac.es`

### Catalog and Negotiation Issues

Cannot See Alice/Bob/Charlie in Registry

Registry Addresses is empty:
- Wait a couple of minutes, synchronization happens on an interval
- Check Control Plane configuration includes playground authority
- Verify your credential was successfully claimed
- Restart control plane pod: `kubectl delete pod <control-plane-pod> -n <namespace>`

Catalog Request Fails

Requesting catalog shows error or times out:
- Verify target participant is accessible (try from browser: `https://alice.playground.dataspac.es/control-plane`)
- Check your Control Plane pod logs for connection errors
- Ensure your cluster has outbound internet access

Negotiation Stuck

Negotiation doesn't show "Accepted" status:
- Wait 10-15 seconds and refresh the page
- Check that the target participant (Alice/Bob/Charlie) is online
- Review Control Plane logs for negotiation protocol errors

### Data Transfer Issues

Transfer Shows "Failed" or "Terminated"

Transfer doesn't activate successfully:
- Check that the contract was fully signed by both parties
- Verify the dataset distribution URL is accessible
- Review Data Plane pod logs for errors

Cannot Execute Data Plane Request

"No active transfer" or "Transfer not found" error:
- Verify you have an Active transfer in Control Plane → Transfers
- In Data Plane, ensure you've selected the correct transfer
- Restart Data Plane pod if transfer list is outdated

Data Plane Returns 404 or 500

Request executes but returns error response:
- Verify the endpoint path is correct (HTTPBin: `/anything`, `/get`, `/post`, etc.)
- Check HTTP method matches endpoint (GET for `/get`, POST for `/post`)
- Ensure the backend API (httpbin.org) is accessible from your cluster

### Network and Access Issues

Cannot Access Web Interfaces

Browser shows "Connection refused" or "DNS not found":
- Verify DNS is configured for your domain
- Check ingress is running: `kubectl get ingress -n <namespace>`
- Verify TLS certificates are issued: `kubectl get certificate -n <namespace>`

"Forbidden" or "Unauthorized" Errors

Login page shows access denied:
- Verify you're using the credentials from your `participant.yaml`
- Check for typos in username/password
- Try different browser or clear cookies

Intermittent Connection Issues

Some requests work, others fail:
- Check Kubernetes pod health: `kubectl get pods -n <namespace>`
- Verify pod resources aren't exhausted: `kubectl top pods -n <namespace>`
- Review pod logs during failures for specific errors

## Advanced Configuration

### Custom Backend API

To share your own API instead of HTTPBin:

1. Update `participant.yaml`:
```yaml
backendUrl: https://api.myorg.com/v1
openApiSpecRef: https://api.myorg.com/openapi.json
```

2. Ensure your API:
   - Is accessible from your Kubernetes cluster
   - Returns proper HTTP responses
   - Has CORS configured if needed
   - Provides an OpenAPI specification

3. Redeploy:
```bash
tsg bootstrap participant -f participant.yaml
tsg deploy participant -f participant.yaml
```

### Multiple Data Planes

You can deploy additional data plane types:

```yaml
dataPlanes:
  http-data-plane:
    type: http-data-plane
    # ... config ...
  
  analytics-data-plane:
    type: analytics-data-plane
    # ... config ...
```

## Cleaning Up

### Remove Your Deployment

To remove your participant from the playground:

```bash
# Delete all resources in the namespace
kubectl delete namespace my-playground-participant

# Or use TSG CLI (if supported)
tsg delete participant -f participant.yaml
```

### Revoke Credentials

Your credential remains in the Authority Wallet even after deletion. Contact the playground administrators if you need credentials revoked.

## Next Steps

### Explore Production Deployment

Ready for production? See:
- [Deployment Guide](../deployment/) - Production-ready deployment strategies
- [Complete Ecosystem](../tools/cli/README.md) - Deploy your own dataspace with authority

### Dive Deeper into TSG

- [Architecture Documentation](../architecture/) - TSG design
- [Component Guides](../apps/) - Detailed component documentation
- [API References](../apis/) - Control Plane and Data Plane APIs

### Connect with the Community

- [GitLab Repository](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway) - Source code and issues
- [Documentation Website](https://tsg.dataspac.es) - Complete TSG documentation

---

If you encounter issues not covered in troubleshooting, please [open an issue](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/issues) with details about your deployment.