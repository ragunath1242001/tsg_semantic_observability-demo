# Getting Started with TSG

This guide will help you quickly get started with TSG by connecting to the TSG Playground - a demonstration dataspace where you can explore TSG's capabilities.

## Prerequisites

Before starting, ensure you have the following tools installed:

### Required Tools
- **Node.js & npm** (version 22 or higher) - [Download here](https://nodejs.org/)
- **kubectl** - [Installation guide](https://kubernetes.io/docs/tasks/tools/)
- **Helm** (version 3.x) - [Installation guide](https://helm.sh/docs/intro/install/)

### Recommended Tools
- **Helm Diff plugin** - Only required if you want to see the changes in Helm deployments. Install with: `helm plugin install https://github.com/databus23/helm-diff`

### Infrastructure Requirements
- **Kubernetes cluster** (version 1.24 or higher)
- **Ingress Controller** with public routes (e.g., [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/))
- **TLS Certificate Management** (e.g., [cert-manager](https://cert-manager.io/)) for HTTPS endpoints

> **Important**: Public HTTPS endpoints with domains are required for DID document resolution and interactions between connectors.

## Installation

### Install the TSG CLI Tool

```bash
npm install -g @tsg-dsp/cli@latest
```

Verify the installation:

```bash
tsg --version
```

## Join the TSG Playground

The TSG Playground is a demonstration dataspace that allows you to quickly experience TSG's capabilities without setting up a complete ecosystem.

> **Security Note**: The playground example uses default security settings suitable for testing. For production deployments, consider enabling [enhanced security features](./tools/cli/configuration.md#security-features-for-production) such as `private_key_jwt` authentication and two-factor authentication (2FA).

### Step 1: Request Playground Access

1. **Navigate to the TSG Playground**: Visit `https://playground.dataspac.es`
2. **Request a Credential Offer**: Follow the instructions to request access as a participant
3. **Receive Pre-authorized Code**: You'll receive a unique `preAuthorizedCode` that allows your participant to join the playground

> **Note**: The playground is currently being updated to support the latest TSG version.

### Step 2: Create Your Participant Configuration

Create a `participant.yaml` file with your participant configuration:

```yaml
general:
  namespace: my-participant                         # ✏️ CUSTOMIZE: Your Kubernetes namespace
  username: admin                                   # ✏️ CUSTOMIZE: Admin username  
  password: "secure-password"                       # ✏️ CUSTOMIZE: Strong password
  authorityDomain: playground.dataspac.es           # Fixed: TSG Playground authority
  credentialType: PlaygroundCredential              # Fixed: Playground credential type

participant:
  host: dataspace.my-org.example                    # ✏️ CUSTOMIZE: Your participant subdomain
  id: my-org                                        # ✏️ CUSTOMIZE: Your unique organization ID
  name: My Organization                             # ✏️ CUSTOMIZE: Your organization name
  hasControlPlane: true
  issuer: false
  credentialSubject:
    role: playground:Participant                    # Fixed: Playground participant role
  preAuthorizedCode: YOUR_RECEIVED_CODE_HERE        # ✏️ REQUIRED: Code from playground registration
  dataPlanes:
    http-data-plane:
      type: http-data-plane
      postgres: true
      tsgDataPlane: true
      subPath: http-data-plane
      config:
        dataset:
          type: versioned
          title: My Organization Data                # ✏️ CUSTOMIZE: Dataset description
          currentVersion: 1.0.0                      # ✏️ CUSTOMIZE: Version number
          versions:
            - version: 1.0.0                         # ✏️ CUSTOMIZE: Match currentVersion
              distributions:
                - backendUrl: https://api.my-org.com/data      # ✏️ CUSTOMIZE: Your API endpoint
                  openApiSpecRef: https://api.my-org.com/spec.json  # ✏️ CUSTOMIZE: OpenAPI specification
```

#### Required Customizations

Before deploying, you **must** customize the following:

1. **Infrastructure Configuration**:
   - `namespace`: Choose a unique Kubernetes namespace name (lowercase, no spaces)
   - `username` and `password`: Set secure initial admin credentials
   - `host`: Configure your participant's domain (subdomain of playground.dataspac.es)

2. **Organization Details**:
   - `id`: Choose a unique identifier for your organization (used to identify deployed services)
   - `name`: Your organization's display name
   - `preAuthorizedCode`: Use the code received from the playground registration

3. **Data Configuration**:
   - `backendUrl`: Your actual API endpoint that serves data
   - `openApiSpecRef`: URL to your API's OpenAPI specification
   - Dataset `title` and version information

4. **Domain Setup**:
   - Ensure DNS is configured to point your subdomain to your Kubernetes ingress
   - Set up TLS certificates for your domain (recommended: use cert-manager to automate certificate management)

### Step 3: Bootstrap Configuration

Generate the deployment configurations:

```bash
tsg bootstrap participant -f participant.yaml
```

This creates an `output/` directory with Helm value files for each component that will be deployed.

### Step 4: Deploy to Kubernetes

Deploy your participant:

```bash
tsg deploy participant -f participant.yaml
```

The CLI will:
1. Create the necessary namespace
2. Deploy TSG components using Helm
3. Configure ingress routes
4. Set up communication with the playground

> **Note**: Ensure your current cluster context is set to the Kubernetes cluster where you want to deploy.  
> `kubectl config current-context`

### Step 5: Verify Deployment

Check that all services are running:

```bash
kubectl get pods -n my-participant
```

Access your participant interfaces:
- **Control Plane**: `https://dataspace.my-org.example/control-plane/`
- **Wallet**: `https://dataspace.my-org.example/control-plane/`
- **Data Plane**: `https://dataspace.my-org.example/http-data-plane/`
- **SSO Bridge**: `https://dataspace.my-org.example/`

> **Note**: Replace `my-participant` with your actual namespace and `dataspace.my-org.example` with your configured domain.

> **Security Tip**: After initial deployment, access the SSO Bridge web interface to review user settings and optionally enable two-factor authentication for enhanced account security.

## Next Steps

### Explore Your Participant

1. **Control Plane Interface**: Use the web interface to manage your data catalogs and view negotiations
2. **Data Sharing**: Configure your data offerings and access policies
3. **Connect with Others**: Discover and connect with other playground participants

### Learn More

- **[CLI Documentation](./tools/cli/README.md)**: Advanced CLI usage and troubleshooting
- **[Configuration Reference](./tools/cli/configuration.md)**: Complete configuration options
- **[Architecture Overview](./architecture/)**: Understanding TSG components and design

### Advanced Scenarios

Ready for more complex deployments? Explore these advanced scenarios:

- **[Complete Ecosystem Setup](./tools/cli/README.md#complete-ecosystem-deployment)**: Deploy your own dataspace with multiple participants
- **[Production Deployment Guide](./deployment/)**: Production-ready deployment strategies
- **[Security Features](./tools/cli/configuration.md#security-features-for-production)**: Enable 2FA and private_key_jwt for enhanced security
- **[Custom Data Planes](./apps/)**: Implementing custom data plane connectors

## Troubleshooting

### Common Issues

**CLI Installation Problems**
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install -g @tsg-dsp/cli@latest
```

**Kubernetes Access Issues**
```bash
# Verify cluster connection
kubectl cluster-info

# Check ingress controller
kubectl get pods -A
```

**TLS Certificate Issues**
```bash
# Check cert-manager status
kubectl get certificates -A
kubectl describe certificate <cert-name> -n <namespace>
```

**Playground Connection Issues**
```bash
# Verify your pre-authorized code is correct
# Check that your domain is properly configured
# Ensure your participant can reach playground.dataspac.es
```

### Getting Help

- **[CLI Documentation](./tools/cli/)**: Detailed CLI usage and configuration
- **[Architecture Documentation](./architecture/)**: System design and troubleshooting
- **[Gitlab Issues](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/issues)**: Report bugs and request features

---

*Ready to build your own dataspace? Check out the [Advanced Deployment Scenarios](./tools/cli/README.md) for complete ecosystem setup and production deployment guides.*
