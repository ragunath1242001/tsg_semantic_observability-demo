# TNO Security Gateway

<div align="center">

![TNO logo](apps/control-plane-ui/public/layout/images/logo-dark.svg)

</div>

This is the repository of the Dataspace Protocol implementation of TNO, called the TNO Security Gateway (TSG). This repository is set up as a `pnpm` monorepo. It contains the apps `wallet`, `control plane` and various data planes: `http data plane` and `analytics data plane`. This allows users of the TSG to share data/participate in a dataspace according to the [Dataspace Protocol](https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol). Identity is managed by the `wallet` component, and is an SSI implementation which is a [protocol that is under development right now](https://projects.eclipse.org/projects/technology.dataspace-dcp).

## Documentation

For documentation, please visit the [docs](docs) folder.

## Structure

### Apps

The apps folder contains all the apps of the TSG components. Most of the apps have an API and a UI part, meaning to be used together. In case a Dockerfile is built, it uses both the API and the UI part and builds 1 image. All of the apps are written in Typescript. The frameworks used are `nestjs` for the APIs and `Vue` for the UIs.

### Docs

The docs folder contains the documentation for each of the components. In the future, these docs will be hosted on a publicly available URL as well.

### Helm Charts

The helm charts folder contains all the helm charts of the TSG. All the documentation around deployments of the TSG focus on Kubernetes deployments via `helm`.

### Libs

The libs folder contains the libraries for the TSG components. Most libs contain logic that is reused between different `apps`. For example: DTOs, Common UI Componennts, etc.

### Release

The release folder contains logic for creating Gitlab Releases.

### Tools

The tools folder contains the tools that can be used to enhance the TSG. At the moment of writing, only the CLI tool is added in here, which can be used to deploy (a subset of) components of the TSG very easily on Kubernetes.

## Issues

If you want to add issues, feel free to do so [here](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/issues).

## Releases

Releases are listed [here](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/releases).

## Contribute

If you want to contribute, please reach out to either Maarten Kollenstart or Willem Datema.
