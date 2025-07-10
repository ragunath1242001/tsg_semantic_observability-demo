# TSG Troubleshooting Guide

This guide helps you diagnose and resolve common issues when deploying and operating TSG (TNO Security Gateway).

## General Troubleshooting Steps

### 1. Check System Status

**Verify Kubernetes cluster health:**
```bash
kubectl cluster-info
kubectl get nodes
kubectl get pods --all-namespaces
```

**Check TSG deployment status:**
```bash
# List all TSG-related pods
kubectl get pods -n tsg-ecosystem

# Check specific namespace
kubectl get all -n tsg-ecosystem
```

**Verify ingress configuration:**
```bash
kubectl get ingress -A
kubectl describe ingress <ingress-name> -n <namespace>
```

### 2. Check Logs

**Application logs:**
```bash
# Control Plane logs
kubectl logs -l app.kubernetes.io/name=tsg-control-plane -n tsg-ecosystem --tail=100

# Data Plane logs  
kubectl logs -l app.kubernetes.io/name=tsg-http-data-plane-plane -n tsg-ecosystem --tail=100

# Wallet logs
kubectl logs -l app.kubernetes.io/name=tsg-wallet -n tsg-ecosystem --tail=100
```

**System logs:**
```bash
# Ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

## CLI Tool Issues

### Installation Problems

**Error: `npm install -g @tsg-dsp/cli` fails**

*Solution:*
```bash
# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Install with specific Node.js version
nvm use 22
npm install -g @tsg-dsp/cli@latest
```

**Error: `tsg: command not found`**

*Solution:*
```bash
# Check npm global path
npm config get prefix

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"

# Verify installation
which tsg
tsg --version
```

### Configuration Validation Errors

**Error: `Invalid YAML syntax`**

*Solution:*
```bash
# Validate YAML syntax
yamllint ecosystem.yaml

# Check for common issues
cat -A ecosystem.yaml  # Shows hidden characters
```

**Error: `Invalid ingress host format`**

*Solution:*
```yaml
ingress:
  host: "dataspace.example.com"  # Valid domain
  # NOT: "http://dataspace.example.com"  # Invalid
```

## Deployment Issues

### Bootstrap Command Failures

**Error: `Output directory not writable`**

*Solution:*
```bash
# Check permissions
ls -la ./output

# Create directory with correct permissions
mkdir -p output
chmod 755 output

# Or specify different output directory
tsg bootstrap ecosystem -o /tmp/tsg-output
```

### Deploy Command Failures

**Error: `kubectl: connection refused`**

*Solution:*
```bash
# Verify kubectl configuration
kubectl config current-context
kubectl cluster-info

# Check cluster connectivity
kubectl get nodes

# Switch context if needed
kubectl config use-context <correct-context>
```

**Error: `Helm not found`**

*Solution:*
```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version

# Install helm-diff plugin
helm plugin install https://github.com/databus23/helm-diff
```

**Error: `Namespace already exists`**

*Solution:*
```bash
# Check existing namespaces
kubectl get namespaces

# Delete existing namespace if safe
kubectl delete namespace tsg-ecosystem
```

## Network and Connectivity Issues

### Ingress Problems

**Error: `502 Bad Gateway` or `503 Service Unavailable`**

*Diagnosis:*
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check backend services
kubectl get svc -n tsg-ecosystem
kubectl get endpoints -n tsg-ecosystem
```

*Solution:*
```bash
# Verify service endpoints
kubectl describe service control-plane -n tsg-ecosystem

# Check pod readiness
kubectl get pods -n tsg-ecosystem -o wide

# Restart ingress controller if needed
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
```

**Error: `404 Not Found` for TSG endpoints**

*Solution:*
```bash
# Verify ingress configuration
kubectl describe ingress -n tsg-ecosystem

# Check ingress annotations
kubectl get ingress -n tsg-ecosystem -o yaml

# Verify DNS resolution
nslookup dataspace.example.com
```

### TLS Certificate Issues

**Error: `TLS handshake failed`**

*Diagnosis:*
```bash
# Check certificate status
kubectl get certificates -A
kubectl describe certificate <cert-name> -n <namespace>

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

*Solution:*
```bash
# Delete and recreate certificate
kubectl delete certificate <cert-name> -n <namespace>
tsg deploy ecosystem  # Will recreate certificate

# Check certificate issuer
kubectl describe clusterissuer letsencrypt-prod
```

**Error: `Certificate not ready`**

*Solution:*
```bash
# Wait for certificate provisioning (can take 5-10 minutes)
kubectl get certificate -n tsg-ecosystem -w

# Check ACME challenge
kubectl get challenges -A
kubectl describe challenge <challenge-name>

# Verify DNS is pointing to ingress
dig dataspace.example.com
```

## Application-Specific Issues

### Control Plane Problems

**Error: `Database connection failed`**

*Solution:*
```bash
# Check database pod
kubectl get pods -l app.kubernetes.io/name=postgresql
kubectl logs -l app.kubernetes.io/name=postgresql

# Verify database credentials
kubectl get secrets -n tsg-ecosystem
kubectl describe secret control-plane-db
```

### Data Plane Problems

**Error: `Transfer request failed`**

*Solution:*
```bash
# Check data plane logs
kubectl logs -l app.kubernetes.io/name=tsg-http-data-plane-plane -A

# Verify data plane registration
kubectl exec -it <control-plane-pod> -- curl http://http-data-plane:8080/health

# Check data source connectivity
kubectl exec -it <data-plane-pod> -- curl <your-data-source-url>
```

### Wallet Problems

**Error: `DID resolution failed`**

*Solution:*
```bash
# Check wallet logs
kubectl logs -l app=wallet -n tsg-ecosystem

# Verify DID document accessibility
curl https://wallet.dataspace.example.com/.well-known/did.json

# Check ingress for wallet
kubectl describe ingress wallet -n tsg-ecosystem
```

**Error: `Credential verification failed`**

*Solution:*
```bash
# Check wallet configuration
kubectl describe configmap wallet-config -n tsg-ecosystem

# Verify key storage
kubectl get secrets -l app=wallet -n tsg-ecosystem

# Test credential endpoint
curl https://wallet.dataspace.example.com/credentials
```

### SSO Bridge Problems

**Error: `OAuth token invalid`**

*Solution:*
```bash
# Check SSO Bridge logs
kubectl logs -l app=sso-bridge -n tsg-ecosystem

# Verify OAuth client configuration
kubectl describe configmap sso-bridge-clients -n tsg-ecosystem

# Test OAuth endpoints
curl https://auth.dataspace.example.com/.well-known/openid-configuration
```

## Performance Issues

### High Resource Usage

**CPU/Memory limits reached:**

*Solution:*
```bash
# Check resource usage
kubectl top pods -n tsg-ecosystem
kubectl top nodes

# Update resource limits in configuration
# Add in values.[APPLICATION].yaml:
```

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

```bash
# Redeploy with updated resources
tsg deploy ecosystem
```

### Slow Response Times

**Network latency issues:**

*Solution:*
```bash
# Check pod-to-pod connectivity
kubectl exec -it <pod1> -- ping <pod2-ip>

# Verify service discovery
kubectl exec -it <pod> -- nslookup control-plane.tsg-ecosystem.svc.cluster.local

# Check ingress performance
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx | grep -i latency
```

## Recovery Procedures

### Complete System Recovery

**If entire deployment is broken:**

```bash
# 1. Backup any important data
kubectl get secrets -n tsg-ecosystem -o yaml > secrets-backup.yaml

# 2. Clean deployment
kubectl delete namespace tsg-ecosystem

# 3. Redeploy from scratch
tsg deploy ecosystem

# 4. Restore data if needed
kubectl apply -f secrets-backup.yaml
```

### Partial Component Recovery

**If single component is failing:**

```bash
# 1. Check which component is failing
kubectl get pods -n tsg-ecosystem

# 2. Get component-specific values
helm get values control-plane -n tsg-ecosystem > control-plane-values.yaml

# 3. Restart component
kubectl rollout restart deployment/control-plane -n tsg-ecosystem

# 4. Or redeploy component
helm upgrade control-plane ./output/control-plane -n tsg-ecosystem -f control-plane-values.yaml
```

## Getting Additional Help

### Diagnostic Information Collection

Before requesting support, collect diagnostic information:

```bash
# Create diagnostic bundle
mkdir tsg-diagnostics
cd tsg-diagnostics

# Collect logs
kubectl logs -l app.kubernetes.io/managed-by=tsg-cli --all-containers=true > tsg-logs.txt

# Collect resource status
kubectl get all -n tsg-ecosystem -o yaml > tsg-resources.yaml

# Collect events
kubectl get events -n tsg-ecosystem --sort-by=.metadata.creationTimestamp > tsg-events.txt

# Collect configuration
cp ../ecosystem.yaml ./
cp -r ../output ./

# Create archive
cd ..
tar -czf tsg-diagnostics.tar.gz tsg-diagnostics/
```

### Support Channels

- **Documentation**: Review [TSG Documentation](README.md)
- **Configuration Reference**: [CLI Configuration Guide](tools/cli/configuration.md)
- **Gitlab Issues**: [Report bugs and feature requests](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/issues)

### Useful External Resources

- **Kubernetes Troubleshooting**: [Official K8s Troubleshooting Guide](https://kubernetes.io/docs/tasks/debug-application-cluster/)
- **Helm Troubleshooting**: [Helm Documentation](https://helm.sh/docs/chart_best_practices/troubleshooting/)
- **cert-manager Issues**: [cert-manager Troubleshooting](https://cert-manager.io/docs/troubleshooting/)
- **NGINX Ingress**: [NGINX Ingress Troubleshooting](https://kubernetes.github.io/ingress-nginx/troubleshooting/)
