# Control Plane

This repository contains the code for the control plane as specified by the Dataspace Protocol. It is a repository containing the frontend, backend and common types in Typescript. The backend uses the NestJS framework, the fronted uses Vue3, and specificially the PrismaVue package.

The package is setup as a pnpm workspace. This means you can run the frontend and backend simultaneously with the following command:

```
pnpm run dev --parallel
```

## Docker build

To build both the Frontend, Backend & libs in a single Docker image run:

```
docker build -t control-plane .
```

Then run it:

```
docker run -p 3000:3000 control-plane
```

And visit http://localhost:3000 to view the control plane.

## Development

For development purpose, you can run the following commands in the root folder to start both frontend & backend in the dev mode:

```
pnpm dev:backend
```

```
pnpm dev:frontend
```

You can run both in one terminal (using pnpm dev) but you'd miss the logs from one of them.

If you want to test interactions between control planes excecute the following commands to generate a second instance:

```
CONFIG_PATH=$(pwd)/apps/backend/config_local.yaml pnpm dev:backend
```

```
BACKEND=http://localhost:3002 pnpm dev:frontend
```
