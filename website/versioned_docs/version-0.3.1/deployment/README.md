# TSG Deployment Documentation

The default deployment strategies are formed around the [TSG CLI tool](/docs/tools/cli/). With this CLI tool configuration bootstrapping and deployment can be done for both:

- an entire ecosystem; covering one or more participants for an environment with the different applications of the TSG.
- a single participant: covering one participant that connects to an existing dataspace.

The differentation between the deployment of an ecosystem or participant only differs in the initial configuration, where the latter only allows a single participant to be configured.

## Prerequisites

The deployments of the TSG support by default only Kubernetes-based infrastructures. The following aspects of the Kubernetes cluster are assumed:

- Kubernetes cluster >=v1.24
- Ingress Controller with publicly available routes, e.g. [Ingress NGINX Controller](https://kubernetes.github.io/ingress-nginx/). Combined with TLS encryption on the ingress controller, e.g. via [CertManager](https://cert-manager.io/). _Required for hosting/resolvement of DID documents, even when all participants are on the same cluster_.

For the machine using the CLI tool, the following elements are required:

- NodeJS & NPM. _Required for installing the CLI tool_
- Installed TSG CLI: `npm install -g @tsg-dsp/cli@latest` to install the latest released version of the CLI (replace `latest` for a specific version if necessary).
- Kubectl
- [Helm](https://helm.sh/docs/intro/quickstart/)
  - [Helm Diff plugin](https://github.com/databus23/helm-diff). _Required if Helm diff is selected via the CLI_

## Configuration

The CLI tool uses configuration YAMLs to properly function. These files specify to the tool what kind of configuration it should generate and which services it should deploy. For an ecosystem the default file is `ecosystem.yaml` and for a single participant this is `participant.yaml`. For a complete overview of the configuration options see the [TSG CLI tool readme](/docs/tools/cli/README.md).

Two examples, that are used in this doc are located at [ecosystem.yaml](ecosystem.yaml) and [participant.yaml](participant.yaml).

## Bootstrapping

The first command of the CLI tool is `tsg bootstrap`, which will convert the input configuration into configuration per service (i.e. Helm release).

The manual for the bootstrap command is as follows:

```
Usage: tsg bootstrap [options] <scope>

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

The command line options can be used to instruct the tool to use different input/output locations.

In most scenario's the CLI tool can be executed in the directory containing either the `ecosystem.yaml` or `participant.yaml` file by executing respectively:

```
tsg bootstrap ecosystem
```

Or:

```
tsg bootstrap participant
```

The generated configuration will then be stored in the `output` folder. With for each participant a separate folder containing `values.*.yaml` files used as input for Helm releases.

## Deployment

After bootstrapping is executed, the deployment can be done via the `tsg deploy` command. Which will invoke the relevant Helm/Kubernetes commands.

The manual for the deploy command is as follows:

```
Usage: tsg deploy [options] <scope>

Deploy configuration to an Kubernetes cluster (requires Helm to be installed)

Arguments:
  scope              scope of deployment (choices: "ecosystem", "participant")

Options:
  -f, --file <file>  input configuration file (default: "ecosystem.yaml" or "participant.yaml")
  --config <dir>     config file location (created by the "bootstrap" command) (default: "output")
  -u, --uninstall    only uninstall charts and secrets (default: false)
  -c, --clean        uninstall existing charts before installing (default: false)
  --clean-database   uninstall database while cleaning (default: false)
  -d, --diff         show diffs before deployment (default: false)
  --dry-run          dry run commands (default: false)
  --cwd <cwd>        working directory for the configuration files
  -v, --verbose      verbose logging (default: false)
  -y --yes           assume yes for all prompts (default: false)
  -h, --help         display help for command
```

The command line options include the input locations, but also some deployment specific commands:

- Uninstall (`-u, --uninstall`): This will completely remove the Helm releases and the generated secrets in the cluster. When this flag is provided, only the uninstall command will be executed. If the intend is to redeploy all services, use `--c, --clean` and `--clean-database`.
- Clean (`-c, --clean`): Removes all Helm releases, except the Postgres release, to ensure all services are restarted with fresh configuration.
- Clean Database (`--clean-database`): Removes the Postgres database release, this will ensure all existing state is removed before redeployment.
- Diff (`-d, --diff`): Shows the [Helm Diff plugin](https://github.com/databus23/helm-diff) diff based on the existing deployed charts and the config that will be deployed.
- Dry-run (`--dry-run`): Shows all commands the tool otherwise would execute, will not execute any commands
- Assyme yes (`-y`): Assume yes for all questions the CLI tool otherwise would ask the user. Usefull in automation, where all flags are set via the command line options.

The CLI tool will ask for confirmation before executing the commands (except when assume yes is enabled):

```
? Confirm or update configuration (Press <space> to toggle options and <enter> to confirm options)
❯◉ use Kubernetes context <<Kubernetes Context Placeholder>> (will abort if not selected)
 ◯ uninstall all resources, without redeployment (will override clean and clean database)
 ◯ clean existing Helm releases
 ◯ delete and redeploy databases
 ◯ execute Helm diff
 ◯ dry run commands
 Press <enter> to confirm configuration
```

## Examples

The following examples of both an ecosystem and participant are minimal configurations that should allow an initial deployment.

### Ecosystem

The ecosystem example uses the [ecosystem.yaml](ecosystem.yaml) file as basis. It will create an ecosystem of 4 participants: 1 dataspace authority and 3 dataspace participants.

#### 1. Update configuration

The example configuration contains several properties that are not filled in but which are required for your deployment:

- `general.password`: The password for the administrative user for the deployed services.
- `general.authorityDomain`: The domain of the authority, should match the participant that acts as authority. This must also be an domain that is under your control and that is configured with DNS entries to point to the Ingress controller within your cluster (e.g. `authority.example.com`).
- `participants[].host`: The domain of the participany, for the authority it must match the `general.authorityDomain` the other participants should be deployed with their own subdomain (e.g. `alfa.example.com`).

The configuration of the authority includes an example for the ExampleCredential, with an JSON-LD document (`participants[0].document`) and JSON Schema (`participants[0].schema`) for this credential. For non-testing ecosystems, this must be changed to reflect the actual credential that you want to use. For testing ecosystems, the default configuration will work.

### 2. Bootstrap configuration

To bootstrap the configuration execute:

```
tsg bootstrap ecosystem
```

This will create a folder structure like this:

```
.
├── ecosystem.yaml
└── output
    ├── alfa
    │   ├── values.casdoor.yaml
    │   ├── values.control-plane.yaml
    │   ├── values.http-data-plane.yaml
    │   ├── values.postgres.yaml
    │   └── values.wallet.yaml
    ├── authority
    │   ├── values.casdoor.yaml
    │   ├── values.postgres.yaml
    │   └── values.wallet.yaml
    ├── bravo
    │   ├── values.casdoor.yaml
    │   ├── values.control-plane.yaml
    │   ├── values.http-data-plane.yaml
    │   ├── values.postgres.yaml
    │   └── values.wallet.yaml
    └── charlie
        ├── values.casdoor.yaml
        ├── values.control-plane.yaml
        ├── values.http-data-plane.yaml
        ├── values.postgres.yaml
        └── values.wallet.yaml
```

### 3. Dry-run

Execute the deploy command with `--dry-run` to see what the deploy command will execute:

```
tsg deploy ecosystem --dry-run
```

This will result in a list of commands the command will execute:

```
✔ Confirm or update configuration use Kubernetes context TSG-Playground (will abort if not selected), dry run commands
[TSG-CLI] LOG   - Deploying ecosystem
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/authority/values.postgres.yaml -n tsg-ecosystem --repo https://charts.bitnami.com/bitnami --version 13.4.0 authority-postgresql postgresql
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait --wait-for-jobs -f output/authority/values.casdoor.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 authority-casdoor casdoor
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/authority/values.wallet.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 authority-tsg-wallet tsg-wallet
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/alfa/values.postgres.yaml -n tsg-ecosystem --repo https://charts.bitnami.com/bitnami --version 13.4.0 alfa-postgresql postgresql
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait --wait-for-jobs -f output/alfa/values.casdoor.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 alfa-casdoor casdoor
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/alfa/values.wallet.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 alfa-tsg-wallet tsg-wallet
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/alfa/values.control-plane.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 alfa-tsg-control-plane tsg-control-plane
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/alfa/values.http-data-plane.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 alfa-tsg-http-data-plane tsg-http-data-plane
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/bravo/values.postgres.yaml -n tsg-ecosystem --repo https://charts.bitnami.com/bitnami --version 13.4.0 bravo-postgresql postgresql
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait --wait-for-jobs -f output/bravo/values.casdoor.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 bravo-casdoor casdoor
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/bravo/values.wallet.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 bravo-tsg-wallet tsg-wallet
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/bravo/values.control-plane.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 bravo-tsg-control-plane tsg-control-plane
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/bravo/values.http-data-plane.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 bravo-tsg-http-data-plane tsg-http-data-plane
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/charlie/values.postgres.yaml -n tsg-ecosystem --repo https://charts.bitnami.com/bitnami --version 13.4.0 charlie-postgresql postgresql
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait --wait-for-jobs -f output/charlie/values.casdoor.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 charlie-casdoor casdoor
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/charlie/values.wallet.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 charlie-tsg-wallet tsg-wallet
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/charlie/values.control-plane.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 charlie-tsg-control-plane tsg-control-plane
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/charlie/values.http-data-plane.yaml -n tsg-ecosystem --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 charlie-tsg-http-data-plane tsg-http-data-plane
```

### 4. First deployment

To actually deploy all the services, execute the deploy command without `--dry-run`:

```
tsg deploy ecosystem
```

This will take some time to execute (±5 minutes per participant), as the Helm upgrade commands will wait for the deployments to succeed.

After the deployment verify whether all services are running (replace `tsg-ecosysten` if you've changed `general.namespace` in the `ecosystem.yaml`):

```
kubectl get pods -n tsg-ecosystem
```

With the default configuration, the services can now be reached at:

- Dataspace Authority:
  - Wallet: https://authority.example.com
- Alfa:
  - Wallet: https://alfa.example.com/wallet/
  - Control Plane: https://alfa.example.com/control-plane/
  - Data Plane: https://alfa.example.com/http-data-plane/
- Bravo:
  - Wallet: https://bravo.example.com/wallet/
  - Control Plane: https://bravo.example.com/control-plane/
  - Data Plane: https://bravo.example.com/http-data-plane/
- Charlie:
  - Wallet: https://charlie.example.com/wallet/
  - Control Plane: https://charlie.example.com/control-plane/
  - Data Plane: https://charlie.example.com/http-data-plane/

### 5. Update deployment

If configuration has changed, execute the bootstrap command again:

```
tsg bootstrap ecosystem
```

This will likely ask you what to do with the existing configuration, select `Move` to move the existing `output` folder to `output.old` and create a new `output folder`.

Execute the deploy command with `--diff` to check the differences in the new deployment with respect to the existing deployment:

```
tsg deploy ecosystem --diff
```

Depending on the changes made, the CLI tool will print the changes to the actual services, and will ask you whether you want to proceed with the update.

### 6. Uninstall deployment

To remove the deployment, execute:

```
tsg deploy ecosystem --uninstall
```

### Participant

The participant example uses the [participant.yaml](participant.yaml) file as basis. It will create a single participant deployment.

#### 1. Update configuration

The example configuration contains several properties that are not filled in but which are required for your deployment:

- `general.password`: The password for the administrative user for the deployed services.
- `general.authorityDomain`: The domain of the authority (e.g. `authority.example.com`).
- `participant.host`: The domain of the participany (e.g. `alfa.example.com`).

### 2. Bootstrap configuration

To bootstrap the configuration execute:

```
tsg bootstrap participant
```

This will create a folder structure like this:

```
.
├── participant.yaml
└── output
    └── zulu
        ├── values.casdoor.yaml
        ├── values.control-plane.yaml
        ├── values.http-data-plane.yaml
        ├── values.postgres.yaml
        └── values.wallet.yaml
```

### 3. Dry-run

Execute the deploy command with `--dry-run` to see what the deploy command will execute:

```
tsg deploy participant --dry-run
```

This will result in a list of commands the command will execute:

```
✔ Confirm or update configuration use Kubernetes context TSG-Playground (will abort if not selected), dry run commands
[TSG-CLI] LOG   - Deploying participant
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/zulu/values.postgres.yaml -n tsg-participant --repo https://charts.bitnami.com/bitnami --version 13.4.0 zulu-postgresql postgresql
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait --wait-for-jobs -f output/zulu/values.casdoor.yaml -n tsg-participant --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 zulu-casdoor casdoor
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/zulu/values.wallet.yaml -n tsg-participant --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 zulu-tsg-wallet tsg-wallet
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/zulu/values.control-plane.yaml -n tsg-participant --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 zulu-tsg-control-plane tsg-control-plane
[TSG-CLI] LOG   - Dry-run: helm upgrade --create-namespace --install --wait -f output/zulu/values.http-data-plane.yaml -n tsg-participant --repo https://nexus.dataspac.es/repository/dsp-stable --version 0.3.0 zulu-tsg-http-data-plane tsg-http-data-plane
```

### 4. First deployment

To actually deploy all the services, execute the deploy command without `--dry-run`:

```
tsg deploy participant
```

This will take some time to execute (±5 minutes), as the Helm upgrade commands will wait for the deployments to succeed.

After the deployment verify whether all services are running (replace `tsg-participant` if you've changed `general.namespace` in the `participant.yaml`):

```
kubectl get pods -n tsg-participant
```

With the default configuration, the services can now be reached at:

- Wallet: https://zulu.example.com/wallet/
- Control Plane: https://zulu.example.com/control-plane/
- Data Plane: https://zulu.example.com/http-data-plane/

### 5. Update deployment

If configuration has changed, execute the bootstrap command again:

```
tsg bootstrap participant
```

This will likely ask you what to do with the existing configuration, select `Move` to move the existing `output` folder to `output.old` and create a new `output folder`.

Execute the deploy command with `--diff` to check the differences in the new deployment with respect to the existing deployment:

```
tsg deploy participant --diff
```

Depending on the changes made, the CLI tool will print the changes to the actual services, and will ask you whether you want to proceed with the update.

### 6. Uninstall deployment

To remove the deployment, execute:

```
tsg deploy participant --uninstall
```
