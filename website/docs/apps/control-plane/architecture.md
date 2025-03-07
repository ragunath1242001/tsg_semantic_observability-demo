# TSG Control Plane architecture

The TSG Control Plane is the basis of an IDS-connector based on the [Dataspace Protocol](https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol/overview/readme). Therefore, the public interfaces of this control plane follow the specifications and HTTPS binding of that protocol.

The authentication is currently implemented by the means of the TSG Wallet or Catena-X Managed Identity Wallet, that allows for a SSI-based IAM solution for the dataspace protocol endpoints.

A component diagram with the primary aspects of the control plane and the interactions with external systems is shown below.

![](https://plantuml.gitlab-static.net/png/U9oDLKrFX30GlVTNJBYZTm-RcDKO3sj8C7emUsYW8h6scpBu4RF_tPO2fRGrt4ZdlPdNDpD5o9f1TlkDJ0dAOI-5O1LAbS4l0MY5Fd-bbORSKAJToNmMIgAi9C_8cH1zyauR7TTCL993mQbWblroKnQmvoqJU8IBYrqq2Ln1tx6EQFoSAuJ1GTOz7_Fgp7kDuBA1iIfdwWXvldE1agdFjc972tzWZSIMOYj5I5a6qxGf0hbgcpVSLikH37vXXuK-AYgwLwP2JNF4pnqSBzIahn5XXNBEwmROJgwDDv7J40Wqkv1VFZo7l3ybhsc4P8CsQsy6UIs_H1vj-eHTNDxX4rsVE5DnHuZrOq0xE-wdZSY6IoGCyQRvkiStRN9RZV9-YVNbgO2xdghwiaH5aJK_euy6lxBmG8LEzQ6pRANCrP-fLeJTr41OWSTnA-_00ez9r2YYXllQt0P_FCPvxbnwToDIbpwvImPhVcW-q4vDR8sMVVQG6rR2moV7SQaZ705FfO6l1OMKGBAXUQ92Zg-P4FFyYk7vTlDfdSk2bPjctBGWAv4gDA-tPTisZamt2QPVZbCercd7hM8dxJ_A4-Lj7ICa1cbpmKtyUFKpySoQVqhXTW-_9HBzCrhMyeNQ0lQUg2q4zpuDw3-o0Nkx)


The interfaces of the control plane are largely covered by the OpenAPI descriptions in `resources/apis` and the accompanying schemas in `resources/schemas`.
