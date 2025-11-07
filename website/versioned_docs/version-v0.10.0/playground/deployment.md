# Deployment and Installation

Deploying your own participant components can help you understand what is needed to participate in a data space. The steps on this page should set you up for data transfer within the TSG Playground data space.

## Deployment

To deploy your own participant so you can interact with others within the dataspace, please follow the [deployment documentation](../deployment#participant). Instead of the `participant.yaml` file, use the [playground.yaml](playground.yaml) file and leave the `general.authorityDomain` as it is. You should only change the `general.username`, `general.namespace`,  `general.password` and the `participant.host`.

## Onboarding in the TSG Playground Dataspace

Navigate to the [Dataspace Authority Wallet](https://playground.dataspac.es/#/home)

Click `Request Credential` and enter your e-mail. You should receive an e-mail from `noreply@dataspac.es` with a button to retrieve your pre-authorized code. Upon clicking on this button you will see your pre-authorized code and the steps on how to claim your credential. After completing these steps you are onboarded to the TSG Playground, congratulations!

## Navigating the catalogs

After claiming your credential, navigate to your `Control Plane` and visit `registry`. In the `Addresses` you will see `Alice`, `Bob` and `Charlie`, and potentially other participants of the TSG Playground data space. If you click on one of the table entries you will request their catalog. This can be the start of your data exchange with another participant.

## Contract Negotiation

Say we clicked on the catalog of `Alice`. In the catalog we will see a dataset called `Alice HTTPBin`. If you click on the `i` icon at the bottom right, you will view the policy and you will get the option to negotiate a contract. If you click this button you will see a red `1` appear next to your Negotiations tab in the control plane. If you navigate here you will see that `Alice` accepted your negotiation request. Sign the negotation and `Alice` will do the same. Afterwards, open the Negotiation in your `Negotiation History` and press Request Transfer. Afterwards, navigate to `Transfers` in the menu and see the transfer has started. **Do not complete, suspend or stop the transfer or you will have to do the previous steps again.**

## Transfer

With an active transfer, we can do some data exchange. Navigate to your data plane and click on `Execute` (middle button) in the `Quick actions` menu. Send a request to `/anything` and you will see the connection works, great!