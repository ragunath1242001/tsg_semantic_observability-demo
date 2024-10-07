# Common UI Library

## Overview

This common UI library serves as the root for the other UIs in the `apps/` folder. The skeleton uses [Primevue v4](https://primevue.org/) and is based on the [Sakai Vue template](https://sakai.primevue.org). The library contains the code that was duplicated in the `apps` folder, to ensure consistency between the User Interfaces. The folders in the common ui library are explained below.

### Assets

The assets folder is needed for Tailwind and the style sheets. As mentioned, these are based on the [Sakai Vue Template](https://sakai.primevue.org/), with minor adjustments to fit our needs.

### Components

The components folder contains UI Vue components that are reused between several UIs. Most of them are basic components such as DisplayField and FormField, to make sure fields are displayed in a uniform way on each UI. The `MonacoEditor` is arguably the most interesting component, as it can display a file as it is displayed within VSCode. It uses the [Vue Monaco Editor library](https://www.npmjs.com/package/@guolao/vue-monaco-editor) under the hood.

### Layout

The layout folder contains the Skeleton for all the webpages. The nav bar, footer, top bar and menu structure is included in here. For more information see [Sakai Vue Documentation](https://sakai.primevue.org/documentation).

### Stores

Pinia is setup in the common UI library as the main store. This library contains the user store, as it is a common functionality. The user store contains a role check, login and logout function. For more information about the used authentication methods, please visit the `docs` folder.

### Utils

The utils folder contains some general utility functions, for example to display dates in a uniform way, and to make sure errors are handled consistently.
