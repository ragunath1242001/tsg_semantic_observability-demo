---
sidebar_label: 'Overview'
---
# TSG Tools

This section contains detailed documentation for tools developed to support TSG deployment, configuration, and management.

## Available Tools

### [CLI Tool](./cli/)
The TSG Command Line Interface (CLI) tool is the primary deployment and configuration utility for TSG environments.

**Key Features:**
- **Automated Deployment**: Deploy complete dataspace ecosystems or single participants
- **Configuration Management**: Generate and manage Kubernetes configurations
- **Multi-Environment Support**: Support for development, staging, and production environments
- **Validation**: Built-in configuration validation and dry-run capabilities

**Quick Start:**
```bash
# Install the CLI
npm install -g @tsg-dsp/cli@latest

# Deploy a complete ecosystem
tsg bootstrap ecosystem -f ecosystem.yaml
tsg deploy ecosystem
```

**Documentation:**
- **[CLI Overview](./cli/)** - Complete CLI documentation and command reference
- **[Configuration Reference](./cli/configuration.md)** - Detailed configuration options and examples
- **[Getting Started](../getting-started.md)** - Step-by-step setup instructions using the CLI

## Development Tools

Additional development and operational tools are available in the TSG repository:

- **E2E Testing Framework**: End-to-end testing tools for dataspace scenarios
- **OpenAPI Generator**: Automated generation of API documentation
- **Configuration Documentation Generator**: Automated generation of configuration documentation

> **Note**: For full setup instructions, see the [Getting Started Guide](../getting-started.md).
