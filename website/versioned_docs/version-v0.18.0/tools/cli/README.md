---
sidebar_label: 'Overview'
toc_max_heading_level: 2
---
# CLI Tool

The TSG CLI tool is a powerful command-line utility for deploying and managing TSG (TNO Security Gateway) environments. It simplifies the process of setting up complete dataspace ecosystems or joining existing dataspaces as a participant.

## Quick Start

**New to TSG?** Start with the [Getting Started Guide](../../getting-started.md) for step-by-step instructions.

**Need configuration help?** See the [Configuration Reference](./configuration.md) for detailed configuration options including security features like 2FA and private_key_jwt authentication.

**Setting up production?** Check out the [Security Features](./configuration.md#security-features-for-production) section for recommendations on securing your deployment.

## Installation

Install the TSG CLI globally using npm:

```bash
npm install -g @tsg-dsp/cli@latest
```

Verify installation:
```bash
tsg --version
```

## Basic Usage

The TSG CLI provides two main deployment scenarios:

### Complete Ecosystem Deployment
Deploy multiple participants in a single environment:

```bash
# Generate configuration files
tsg bootstrap ecosystem

# Deploy to Kubernetes
tsg deploy ecosystem
```

### Single Participant Deployment
Join an existing dataspace:

```bash
# Generate configuration files
tsg bootstrap participant

# Deploy to Kubernetes
tsg deploy participant
```

## Command Reference

```
Usage: tsg-cli [options] [command]

Options:
  -v, --version                output the current version
  -h, --help                   display help for command

Commands:
  bootstrap [options] <scope>  Bootstrap CLI utility to generate configuration files
  deploy [options] <scope>     Deploy configuration to an Kubernetes cluster (requires Helm to be installed)
  keys                         Manage cryptographic keys for client authentication
  help [command]               display help for command
```

### Bootstrap Command

Generates Helm value files and Kubernetes manifests from your configuration:

```
Usage: tsg-cli bootstrap [options] <scope>

Bootstrap CLI utility to generate configuration files

Arguments:
  scope               scope of configuration generation (choices: "ecosystem", "participant")

Options:
  -f, --file <file>   input configuration file (default: "ecosystem.yaml" or "participant.yaml")
  -o, --output <dir>  output directory (default: "output")
  --stdout            output only to standard out (default: false)
  -v, --verbose       verbose logging (default: false)
  -y --yes            assume yes for all prompts (default: false)
  -h, --help          display help for command
```

**Examples:**
```bash
# Custom configuration file
tsg bootstrap participant -f my-participant.yaml

# Standard output only
tsg bootstrap participant -f my-participant.yaml --stdout

# Generate to specific directory
tsg bootstrap ecosystem  -f my-ecosystem.yaml-o ./deployment-configs
```

### Deploy Command

Deploys generated configurations to Kubernetes using Helm:

```
Usage: tsg-cli deploy [options] <scope>

Deploy configuration to an Kubernetes cluster (requires Helm to be installed)

Arguments:
  scope                    scope of deployment (choices: "ecosystem", "participant")

Options:
  -f, --file <file>        input configuration file (default: "ecosystem.yaml" or "participant.yaml")
  --config <dir>           config file location (created by the "bootstrap" command) (default: "output")
  -u, --uninstall          only uninstall charts and secrets (default: false)
  -c, --clean              uninstall existing charts before installing (default: false)
  --clean-database         uninstall database while cleaning (default: false)
  -d, --diff               show diffs before deployment (default: false)
  --dry-run                dry run commands (default: false)
  --cwd <cwd>              working directory for the configuration files
  -v, --verbose            verbose logging (default: false)
  -y --yes                 assume yes for all prompts (default: false)
  -t, --timeout <timeout>  timeout for helm commands (default: "300")
  -h, --help               display help for command
```

**Examples:**
```bash
# Basic deployment
tsg deploy ecosystem

# Dry run to see what would be deployed
tsg deploy participant --dry-run

# Show differences before deploying
tsg deploy ecosystem --diff
```

### Keys Command

Manages cryptographic keys for `private_key_jwt` client authentication:

```
Usage: tsg-cli keys <command>

Manage cryptographic keys for client authentication

Commands:
  generate [options]  Generate a new key pair for private_key_jwt client authentication
```

**Generate Subcommand**:
```
Usage: tsg-cli keys generate [options]

Generate a new key pair for private_key_jwt client authentication

Options:
  -o, --output <dir>          output directory for generated keys
  -a, --algorithm <algorithm> key algorithm (RS256, RS384, RS512, ES256, ES384, ES512)
  -k, --key-id <keyId>        key ID (kid)
  -y, --yes                   assume yes for all prompts (default: false)
  -h, --help                  display help for command
```

**Examples:**
```bash
# Interactive key generation (will prompt for options)
tsg keys generate

# Generate with specific algorithm
tsg keys generate --algorithm ES256 --output ./keys

# Non-interactive generation
tsg keys generate --algorithm RS256 --key-id my-key-2024 --yes
```

> **Note**: The `tsg bootstrap` command automatically generates all required keys when using `oauthClientAuthMethod: private_key_jwt`. This command is useful for manual key generation or key rotation scenarios.

## Configuration Files

The CLI uses YAML configuration files to define your deployment. There are two main configuration types:

### Ecosystem Configuration (`ecosystem.yaml`)
**Use this when**: Creating a complete dataspace from scratch with multiple participants

An ecosystem configuration:
- Defines a complete dataspace environment with an authority and multiple participants
- Includes the dataspace authority (credential issuer) 
- Sets up multiple participants that can communicate with each other
- Configures the entire credential schema and governance model
- Best for: New dataspace environments, testing, demonstrations, or when you need full control

**Key characteristics:**
- Contains multiple participants in the `participants` array
- One participant acts as the authority (`issuer: true`)
- Defines the credential schema and JSON-LD context documents
- Sets up the complete trust framework

### Participant Configuration (`participant.yaml`)
**Use this when**: Joining an existing dataspace as a new participant

A participant configuration:
- Connects a single participant to an existing dataspace
- Requires information from the existing dataspace authority
- Uses the authority's established credential schema and governance
- Minimal configuration focused on your organization's data offerings
- Best for: Joining established dataspaces, production deployments, connecting to external ecosystems

**Key characteristics:**
- Contains a single `participant` object (not an array)
- References an external authority via `authorityDomain`
- Requires pre-authorized codes and role definitions from the authority
- Focuses on your organization's data planes and offerings

### Getting Started

- **New to TSG?** Start with the [Getting Started Guide](../../getting-started.md) for a step-by-step participant setup
- **Need detailed configuration help?** See the [Configuration Reference](./configuration.md) for complete examples and all available options
- **Ready for advanced scenarios?** The configuration reference includes ecosystem examples and advanced deployment patterns

## Prerequisites

Before using the CLI, ensure you have:

### Required Tools
- **Node.js & npm** (version 22 or higher) - [Download here](https://nodejs.org/)
- **kubectl** - [Installation guide](https://kubernetes.io/docs/tasks/tools/)
- **Helm** (version 3.x) - [Installation guide](https://helm.sh/docs/intro/install/)
- **Helm Diff plugin** - Install with: `helm plugin install https://github.com/databus23/helm-diff`

### Infrastructure Requirements
- **Kubernetes cluster** (version 1.24 or higher)
- **Ingress Controller** with public routes (e.g., [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/))
- **TLS Certificate Management** (e.g., [cert-manager](https://cert-manager.io/)) for HTTPS endpoints
- **CloudNativePG Operator** (recommended) - PostgreSQL operator for database management

> **Important**: Public HTTPS endpoints are required for DID document resolution and interactions between connectors.

### Installing CloudNativePG Operator

The CLI uses CloudNativePG for PostgreSQL management. The operator will be automatically checked during deployment, and you'll be prompted to install it if not found.

You can also install it manually before deploying:

```bash
# Add the CloudNativePG Helm repository
helm repo add cnpg https://cloudnative-pg.github.io/charts

# Install the operator in the cnpg-system namespace
helm upgrade --install cnpg \
  --namespace cnpg-system \
  --create-namespace \
  cnpg/cloudnative-pg

# Verify the operator is running
kubectl get pods -n cnpg-system
```

## Workflow

### Typical Development Workflow

1. **Create Configuration**
   ```bash
   # Start with example configuration
   cp ecosystem.example.yaml ecosystem.yaml
   # Edit configuration for your needs
   ```

2. **Bootstrap configuration**
   ```bash
   # Generate deployment files
   tsg bootstrap ecosystem
   ```

3. **Review Generated Files**
   ```bash
   # Check generated Helm values
   tree output/
   ```

4. **Deploy**
   ```bash
   # Dry run first
   tsg deploy ecosystem --dry-run
   
   # Deploy to cluster
   tsg deploy ecosystem
   ```

5. **Verify Deployment**
   ```bash
   # Check pod status
   kubectl get pods -n k8s-namespace
   
   # Check ingress
   kubectl get ingress -n k8s-namespace
   ```

### Production Deployment Workflow

1. **Environment-Specific Configuration**
   ```bash
   # Use environment-specific configs
   tsg bootstrap ecosystem -f configs/production.yaml
   ```

2. **Review Changes**
   ```bash
   # Show differences before deployment
   tsg deploy ecosystem --diff
   ```

3. **Staged Deployment**
   ```bash
   # Deploy with confirmation prompts
   tsg deploy ecosystem
   ```

4. **Monitoring**
   ```bash
   # Monitor deployment progress
   kubectl get pods -n production-dataspace -w
   ```

## Generated Output Structure

After running `tsg bootstrap`, the output directory contains (by default `output/` and for ecosystem bootstraps it contains a folder for each participant):

```
├── postgres.yaml
├── values.control-plane.yaml
├── values.http-data-plane.yaml
├── values.sso-bridge.yaml
└── values.wallet.yaml
```

## State management

After running either `tsg bootstrap` or `tsg deploy`, the CLI updates the state of the bootstrap process in the `[ecosystem|participant].tsg-state.json` file. This file tracks which configuration files have been created in the output directory, as well as, the helm releases that have been deployed by the CLI.

This is used to ensure the config and state are in sync between the CLI and the Kubernetes cluster.

> **_Tip_**: check in the state file into version control to keep track of changes.

## Troubleshooting

### Common Issues and Solutions

**Installation Problems**
```bash
# Clear npm cache
npm cache clean --force
npm install -g @tsg-dsp/cli@latest

# Check Node.js version
node --version  # Should be 22+
```

**Configuration Validation Errors**
```bash
# Use verbose mode for detailed errors
tsg bootstrap ecosystem --validate --verbose

# Check YAML syntax
yamllint ecosystem.yaml
```

**Deployment Failures**
```bash
# Check cluster connectivity
kubectl cluster-info

# Verify Helm installation
helm version

# Check namespace permissions
kubectl auth can-i create pods --namespace tsg-ecosystem
```

**Ingress Issues**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Verify certificate status
kubectl get certificates -A
kubectl describe certificate <cert-name>
```

### Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
# Verbose bootstrap
tsg bootstrap ecosystem --verbose

# Verbose deployment with dry-run
tsg deploy ecosystem --verbose --dry-run
```

### Getting Help

- **Configuration Issues**: See [Configuration Reference](./configuration.md)
- **Deployment Problems**: Check [Deployment Guide](../../deployment/)
- **Architecture Questions**: Review [Architecture Documentation](../../architecture/)
- **Bug Reports**: [GitHub Issues](https://github.com/tno-tsg/tno-security-gateway/issues)

## Advanced Usage

### Custom Helm Charts

Override default Helm chart locations via the `applications` configuration property in your `ecosystem.yaml` or `participant.yaml`:

```yaml
applications:
  controlPlane:
    chartVersion: 0.0.0
    chartName: custom-chart-name
    imageTag: custom-image-tag
    imageRepository: custom-repo
```


```bash
# Use local Helm charts
tsg deploy ecosystem
```

### CI/CD Integration

Use the CLI in CI/CD pipelines:

```bash
# Non-interactive deployment
tsg deploy ecosystem --yes --timeout 15m
```

## Next Steps

- **[Getting Started Guide](../../getting-started.md)** - Step-by-step setup instructions
- **[Configuration Reference](./configuration.md)** - Complete configuration documentation
- **[Deployment Guide](../../deployment/)** - Advanced deployment scenarios
- **[Architecture Overview](../../architecture/)** - Understanding TSG components