# Runtime Settings

Runtime settings are settings that are configurable, but can be changed in the UI at runtime as well. Currently the Control Plane has the following runtime settings:

## Control Plane Interactions

Control Plane Interactions can be `automatic`, `manual`, or `semi-automatic`. Settings your control plane interactions to `automatic` means that for consumers, an offer is created automatically based on the contract offer of the provider and sent to the provider as a Contract Offer. This means the consumer agrees with the offer as stated by the provider. Since the offer of the consumer is the same as the offer of the provder, the provider will accept the contract negotiation offer and afterwards both parties will sign the contract as well. In all other cases, if a consumer sends a contract negotiation offer with a different Offer than is provided by the provider, the Contract Negotiation process will be terminated on both sides.

For `semi-automatic` control plane interactions, the interactions function the same as with `automatic` control plane interactions. However, if the offer is not exactly the same as the offer of the provider, the contract negotiation will not be terminated, but left in a state where it can be reviewed by the provider to see if there should be changes to the offer or not.

For `manual` control plane interactions, user interactions are necessary for all steps in the contract negotiation process. This is also the default setting.
