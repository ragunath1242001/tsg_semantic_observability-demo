# Control Plane UI

This app contains the logic for the Control Plane UI. It is meant to be used with the Control Plane API within this monorepo. It uses the `libs/common-ui` library for the skeleton of each webpage. The router view is filled with contents from this app.

## External libraries

- [Vue](https://vuejs.org)
- [Vue Router](https://router.vuejs.org/) for navigation
- [Primevue](https://primevue.org/) for generic components
- [Pinia](https://pinia.vuejs.org/) as the store provider

## Project Setup

### Prerequisites

Ensure you have the following installed:

- Node.js (v20+)
- pnpm

### Installation

```
git clone https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway.git
pnpm install
```

### Running the app

```
pnpm --filter control-plane-ui dev
```

This will open the app at `http://localhost:5173`.
