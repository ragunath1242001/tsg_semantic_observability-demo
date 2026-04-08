# TSG Playground

Experience a live, fully operational dataspace — no installation required. The TSG Playground lets you discover datasets, negotiate contracts, and transfer data between real participants in minutes.

:::tip No setup needed
Jump straight in with a browser. The playground is always running and ready to use.
:::

## What You Get

The playground is a complete dataspace environment with three independent participants — Alice, Bob, and Charlie — each running their own TSG stack. An Authority Wallet issues the Verifiable Credentials that establish trust between them.

| Component | Role |
|---|---|
| **Authority Wallet** | Issues credentials and anchors trust in the dataspace |
| **Three Participants** | Alice, Bob, and Charlie, each with a full TSG stack |
| **Pre-configured Datasets** | HTTPBin test services ready for immediate use |
| **Automated Negotiations** | Contracts are auto-accepted so you can focus on the flow, not the setup |

### What You Can Do Here

- **Learn** — see dataspace concepts in action: catalogs, policies, contract negotiation, and data transfer
- **Explore** — browse participants' catalogs and understand how access control works
- **Demonstrate** — show stakeholders a working dataspace end-to-end
- **Validate** — test your own client integrations before going live

---

## Quick Access

:::info Credentials
All playground components share the same login:

- **Username:** `playground`
- **Password:** `test`

These are shared demo credentials. Do not enter sensitive or production data.
:::

### Live Component URLs

**Authority**

| Component | URL |
|---|---|
| Authority Wallet | [playground.dataspac.es/wallet](https://playground.dataspac.es/wallet) |

**Alice**

| Component | URL |
|---|---|
| Wallet | [alice.playground.dataspac.es/wallet](https://alice.playground.dataspac.es/wallet) |
| Control Plane | [alice.playground.dataspac.es/control-plane](https://alice.playground.dataspac.es/control-plane) |
| HTTP Data Plane | [alice.playground.dataspac.es/http-data-plane](https://alice.playground.dataspac.es/http-data-plane) |

**Bob**

| Component | URL |
|---|---|
| Wallet | [bob.playground.dataspac.es/wallet](https://bob.playground.dataspac.es/wallet) |
| Control Plane | [bob.playground.dataspac.es/control-plane](https://bob.playground.dataspac.es/control-plane) |
| HTTP Data Plane | [bob.playground.dataspac.es/http-data-plane](https://bob.playground.dataspac.es/http-data-plane) |

**Charlie**

| Component | URL |
|---|---|
| Wallet | [charlie.playground.dataspac.es/wallet](https://charlie.playground.dataspac.es/wallet) |
| Control Plane | [charlie.playground.dataspac.es/control-plane](https://charlie.playground.dataspac.es/control-plane) |
| HTTP Data Plane | [charlie.playground.dataspac.es/http-data-plane](https://charlie.playground.dataspac.es/http-data-plane) |

---

## How the Components Fit Together

Each participant runs three components that work together to enable secure data exchange:

**Wallet** — manages participant identity using Self-Sovereign Identity (SSI). It stores the Verifiable Credential issued by the Authority, which proves membership in the dataspace.

**Control Plane** — implements the Dataspace Protocol. It handles catalog publication, contract negotiation with other participants, and transfer lifecycle management.

**HTTP Data Plane** — executes the actual data exchange. It proxies requests to backend services and enforces the terms agreed in the transfer contract.

---

## Tutorial: Complete a Data Exchange

This walkthrough guides you through the full flow: discovering a participant, negotiating a contract, and retrieving data. It takes about five minutes.

### Step 1: Open the Control Plane

1. Go to **[Alice's Control Plane](https://alice.playground.dataspac.es/control-plane)**
2. Log in with `playground` / `test`
3. The dashboard appears with a navigation menu on the left

### Step 2: Discover Other Participants

1. In the left menu, click **Federated Catalog → Addresses**
2. Bob and Charlie appear, along with any other participants currently connected to the playground
3. Click on **Bob** to open his entry
4. Click **Request Catalog** to fetch his available datasets

The catalog shows all datasets Bob is willing to share, together with the access policies that govern them.

### Step 3: Browse Bob's Catalog

1. Bob's dataset **"Bob HTTPBin"** appears
2. Click the info icon on the dataset to view its details

The dataset details reveal:
- **Title:** Bob HTTPBin
- **Version:** 0.9.2
- **Conforms to:** HTTPBin OpenAPI specification
- **Policy:** Always Allow (unrestricted access)
- **Distribution:** API endpoint details

### Step 4: Negotiate a Contract

1. From the dataset details, click **Negotiate Contract**
2. The system sends a contract negotiation request to Bob
3. Because negotiations are automated in the playground, the agreement completes immediately

This establishes a formal, policy-backed agreement to access Bob's dataset.

### Step 5: Start a Transfer

1. In the left menu, click **Negotiations**
2. Find your completed negotiation with Bob
3. Click on it to open the details
4. Click **Request Transfer**

A transfer agreement is created on top of the contract. This is the active permission that the data plane will verify.

### Step 6: Confirm the Transfer is Active

1. Click **Transfers** in the left menu
2. Your transfer with Bob appears with status **Active**

:::warning Keep the transfer active
Do not complete, suspend, or terminate this transfer — you need it to stay active in order to access data.
:::

### Step 7: Retrieve Data

Now switch to the data plane to make an actual request through the secure channel:

1. Open **[Alice's HTTP Data Plane](https://alice.playground.dataspac.es/http-data-plane)**
2. Log in with `playground` / `test`
3. Click **Execute** in the Quick Actions menu
4. Fill in the request form:
   - **Method:** GET
   - **Path:** `/anything`
   - **Headers:** (leave as default)
   - **Body:** (empty for GET)
5. Click **Send Request**

A successful response looks like this:

```json
{
  "args": {},
  "headers": { "..." },
  "method": "GET",
  "origin": "...",
  "url": "..."
}
```

You have just completed a full, policy-governed data exchange across a live dataspace.

---

## Available Datasets

All three participants expose the same dataset for testing purposes.

### HTTPBin Test Service

A request-and-response echo service — whatever you send, it reflects back. Policy is set to **Always Allow**, so no restrictions apply.

| Endpoint | Description |
|---|---|
| `/anything` | Echoes the full request back |
| `/get` | Returns GET request data |
| `/post` | Returns POST request data |
| `/put` | Returns PUT request data |
| `/delete` | Returns DELETE request data |
| `/headers` | Returns request headers |
| `/ip` | Returns your origin IP address |
| `/user-agent` | Returns the user-agent string |
| `/status/{code}` | Returns the specified HTTP status code |

**Example:** Send a POST to `/post` with:

```json
{
  "message": "Hello from the playground!"
}
```

The response echoes your message back with a `200` status, along with metadata about the request.

---

## More Things to Try

### Test Different HTTP Methods

Once you have an active transfer, explore the full set of HTTP operations from the Data Plane:

- **GET** `/get` — retrieve data
- **POST** `/post` with a JSON body — send data
- **PUT** `/put` with a JSON body — update data
- **DELETE** `/delete` — trigger a delete operation

### Explore the Control Plane Sections

| Section | What to look for |
|---|---|
| **Dashboard** | Live statistics and recent activity |
| **Registry** | Known participants; request catalogs from here |
| **Catalogs** | Datasets available from other participants |
| **Negotiations** | History of completed contracts |
| **Transfers** | Active and historical data exchanges |

### Inspect the Wallet

Identity in a dataspace is built on Verifiable Credentials. To see how:

1. Open any participant's **Wallet** (e.g., [Alice's Wallet](https://alice.playground.dataspac.es/wallet))
2. Log in with `playground` / `test`
3. View the stored Verifiable Credential
4. Examine the credential subject — it records the participant's role and identity within the dataspace

This is what the Authority checks when deciding whether to trust another participant.

---

## Troubleshooting

### Cannot log in

:::note
Use `playground` / `test` (all lowercase, no spaces). Try a different browser or clear your browser cookies if login still fails.
:::


### Data Plane shows "No active transfer"

:::note
Go to **Control Plane → Transfers** and confirm your transfer has status **Active**. If it shows Completed, Suspended, or Stopped, re-request a transfer from the Negotiations view.
:::

### Request returns an error

:::note
Check that the endpoint path starts with `/` (e.g., `/anything`, not `anything`). Make sure the HTTP method matches the endpoint — use GET for `/get`, POST for `/post`, and so on. If the path is correct, it might be that the HTTPBin service is not working temporarily.
:::

### Page does not load

:::note
Double-check the subdomain in the URL. If the page still does not respond, the playground may be temporarily under maintenance.
:::

---

## Next Steps

### Deploy Your Own Participant

Ready to connect your own infrastructure to the playground? The [Deployment Guide](./deployment.md) walks you through:

- Deploying your Wallet, Control Plane, and HTTP Data Plane on Kubernetes
- Requesting a credential from the Authority Wallet
- Exchanging data with Alice, Bob, and Charlie from your own participant

### Go Deeper

| Resource | Description |
|---|---|
| [Getting Started Guide](../getting-started.md) | Full TSG setup and CLI walkthrough |
| [Architecture Overview](../architecture/) | How TSG components are designed and interact |
| [Deployment Documentation](../deployment/) | Production deployment strategies |
| [CLI Tool Guide](../tools/cli/) | Automated deployment and configuration |

### Explore Advanced Features

- **[Analytics Data Plane](../apps/analytics-data-plane/)** — run distributed analytics queries across participant datasets
- **[Custom Data Planes](../apps/)** — build your own data plane connectors for non-HTTP protocols

---

## Feedback and Support

Found an issue or want to suggest an improvement?

- [Open an issue on GitLab](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/issues) — bug reports and feature requests
- [TSG Documentation](https://tsg.dataspac.es) — the complete reference documentation