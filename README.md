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
