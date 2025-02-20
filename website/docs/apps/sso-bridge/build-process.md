# Build Process

This repository is setup as a monorepo with pnpm. The main components are in the `apps` and `libs` folders. They are linked together in one monorepo by pnpm, the file where this is specified is called `pnpm-workspace.yaml`. The `apps` folder contains the sso-bridge-ui and sso-bridge-api packages, the `libs` folder contains the `dto`s that are common between the sso-bridge-ui and the sso-bridge-api. At the root of the monorepo we define a root `package.json` and a `Dockerfile`. This means that there is one docker image for both the sso-bridge-api and the sso-bridge-ui. The sso-bridge-ui can be enabled in the sso-bridge-api by setting an environment variable called `EMBEDDED_FRONTEND`.

To make use of pnpm, make sure to install it. Then, to use the specific scripts in the root of the repository you can run:

```
pnpm install
```

And afterwards you can run a command by using `pnpm ...` with any command that is listed in the `package.json` file. If you want to run a command only for a specific package (for example sso-bridge-api) you can run `pmpm --filter sso-bridge-api ...` where at the dots you can place a command that is in the `package.json` of that specific app/lib.

## Development

For development, everything is setup to be used with vscode. This means tests will automatically run on save, prettier will make code styling consistent, and debug scripts are available.

To run the sso-bridge-ui and sso-bridge-api in watch mode use the following command:

```
pnpm run dev:sso-bridge-api
```

and

```
pnpm run dev:sso-bridge-ui
```

Another option is to run them in parallel by running:

```
pnpm run dev --parallel
```

However, in that case you do not get the logs from both applications and some information might be missing from the logs.

If you want to test interactions between control planes excecute the following commands to generate a second instance. For this you would need to create a separate config file (based on the existing default config at `./apps/sso-bridge-api/config.yaml`) as well as provide the sso-bridge-api used by the sso-bridge-ui via the `BACKEND` environment variable:

```
CONFIG_PATH=$(pwd)/apps/sso-bridge-api/config_second.yaml pnpm dev:sso-bridge-api
```

```
BACKEND=http://localhost:3002 pnpm dev:sso-bridge-ui
```

## Docker

For building the docker image you can use the default docker commands to build and run the images and containers.

```
docker build -t sso-bridge .
```

Then run it:

```
docker run -p 3000:3000 sso-bridge
```

And visit http://localhost:3000 to view the SSO bridge.

## Database Schema Migrations

If changes are made to the data access objects (`*.dao.ts`) it is required to run the migrations scripts to ensure the database schemas can be applied / updated. The migration files are located under `src/migrations` with separate files for Postgres (`*-postgres.ts`) and SQLite (`*-sqlite.ts`).

Manual creation of migrations files is supported, but automated generation of migration files is supported by running (takes some time to run):

```
pnpm --filter sso-bridge-api migrations:generate
```

In the CI pipelines automated checks are done in the testing stage to see whether migrations are required. You can manually execute this check to quickly see whether there is a need to generate new migrations:

```
pnpm --filter sso-bridge-api migrations:check
```

## Continuous Integration

The Continuous Integration pipelines will run every time a merge request is created. The CI pipeline consists of a few stages. Each stage will be described below.

### Build

The first stage is to build the docker image. The type checks will be done and afterwards all the TypeScript files are transformed to javascript files to run in a docker container.

### Dependency and container scanning

The dependencies and container is scanned for vulnerabilities. If there is a vulnerability, this needs to be fixed before merging the current merge request.

### Tests

In the CI pipeline on Gitlab, the tests are automatically ran. They will also return a code coverage score. Please make sure this code coverage does not decrease too much when submitting Merge Requests.

### Release

If all previous steps succeed, Semantic Versioning can be used to create a release including the new changes. It has been decided to not do this on every merge request, but on a manual click on a button by one of the administrators.
