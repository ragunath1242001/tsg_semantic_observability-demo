# Control Plane

This repository contains the code for the control plane as specified by the Dataspace Protocol. It is a repository containing the frontend, backend and common types in Typescript. The backend uses the NestJS framework, the fronted uses Vue3, and specificially the PrismaVue package.

The package is setup as a pnpm workspace. This means you can run the frontend and backend simultaneously with the following command:

```
pnpm run dev --parallel
```