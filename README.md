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

You can run both in one terminal but you'd miss the logs from one of them.

If you want to test interactions between control planes, we recommend to run one docker container on port 3001 and the normal backend on 3000. You can access the local running instance by using host.docker.internal instead of localhost for the publicAddress in the config.yaml of the local running instance.
