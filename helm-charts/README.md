# Helm Charts

This folder contains the Helm charts related to the TSG.

## Core templates

The Helm charts share large portions of the templates, therefore, these core templates are located in [core/templates]().
Due to the structure of the Helm charts, these templates are injected into the Helm charts using symbolic links instead of leveraging Helm subcharts.

The usage of the core templates is as follows:

- [Wallet chart](./wallet): Uses only core templates
- [Control Plane chart](./control-plane): Uses only core templates
- [Data Plane chart](./http-data-plane): Uses only core templates
- [Casdoor chart](./casdoor): Only uses `_helpers.tpl` from core templates
