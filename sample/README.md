# Sample deployments

This folder contains sample deployments that can easily be started from the command line. To launch a sample deployment, you must have [Zellij installed](https://zellij.dev/documentation/installation.html). Zellij is a terminal workspace utility, that supports tabs and split views. This is very convenient for debugging and monitoring the logs of the various apps of the TNO Security Gateway.

To launch a deployment, open the `.kdl` layout file with Zellij (this can be done from any directory within the repository):

```bash
zellij --layout sample/analytics/analytics.kdl
```

Click on a specific tab to monitor the logs, or use the Zellij keyboard shortcuts.

All pnpm procceses are started with the `--inspect-brk` parameter. This allows you to attach a Node.js debugger from your favorite code editor.

To stop a deployment, press <kbd>Ctrl</kbd> + <kbd>q</kbd>. In the rare ocassion that a deployment is not properly terminated (which will prevent you from launching the deployment again, as the ports are still allocated by dangling processes), you can run `zellij ka`.

## Overview of sample deployments

The table below contains an overview with descriptions of the sample deployments.

| Sample      | Description                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `analytics` | One authority wallet and two participants (alfa and bravo) with a control plane, analytics data plane and wallet. |
