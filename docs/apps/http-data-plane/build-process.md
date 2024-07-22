# Build Process

This repository is setup as a monorepo with pnpm. The main components are in the `apps` and `libs` folders. They are linked together in one monorepo by pnpm, the file where this is specified is called `pnpm-workspace.yaml`. The `apps` folder contains the frontend and backend packages, the `libs` folder contains the `dto`s that are common between the frontend and the backend. At the root of the monorepo we define a root `package.json` and a `Dockerfile`. This means that there is one docker image for both the backend and the frontend. The frontend can be enabled in the backend by setting an environment variable called `EMBEDDED_FRONTEND`.

To make use of pnpm, make sure to install it. Then, to use the specific scripts in the root of the repository you can run:

```
pnpm install
```

And afterwards you can run a command by using `pnpm ...` with any command that is listed in the `package.json` file. If you want to run a command only for a specific package (for example backend) you can run `pmpm --filter backend ...` where at the dots you can place a command that is in the `package.json` of that specific app/lib.

## Development

For development, everything is setup to be used with vscode. This means tests will automatically run on save, prettier will make code styling consistent, and debug scripts are available.

To run the frontend and backend in watch mode use the following command:

```
pnpm run dev:backend
```

and

```
pnpm run dev:frontend
```

Another option is to run them in parallel by running:

```
pnpm run dev --parallel
```

However, in that case you do not get the logs from both applications and some information might be missing from the logs.

If you want to test interactions between control planes excecute the following commands to generate a second instance. For this you would need to create a separate config file (based on the existing default config at `./apps/backend/config.yaml`) as well as provide the backend used by the frontend via the `BACKEND` environment variable:

```
CONFIG_PATH=$(pwd)/apps/backend/config_second.yaml pnpm dev:backend
```

```
BACKEND=http://localhost:3002 pnpm dev:frontend
```

## Docker

For building the docker image you can use the default docker commands to build and run the images and containers.

```
docker build -t http-data-plane .
```

Then run it:

```
docker run -p 3000:3000 http-data-plane
```

And visit http://localhost:3000 to view the http data plane.

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
