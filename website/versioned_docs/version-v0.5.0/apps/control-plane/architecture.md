# TSG Control Plane architecture

The TSG Control Plane is the basis of an IDS-connector based on the [Dataspace Protocol](https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol/overview/readme). Therefore, the public interfaces of this control plane follow the specifications and HTTPS binding of that protocol.

The authentication is currently implemented by the means of the TSG Wallet or Catena-X Managed Identity Wallet, that allows for a SSI-based IAM solution for the dataspace protocol endpoints.

A component diagram with the primary aspects of the control plane and the interactions with external systems is shown below.

```plantuml
node "External Connector" {
  interface "Dataspace Protocol"
}

package "Control Plane" {
  [DSP Client] ..> "Dataspace Protocol" : uses

  package "Dataspace Protocol Module" {
    [Catalog Controller] --> [Catalog Service]
    [Negotiation Controller] --> [Negotiation Service]
    [Negotiation Service] -right-> [Catalog Service]
    [Negotiation Service] --> [DSP Client]
    [Transfer Controller] --> [Transfer Service]
    [Transfer Service] -right-> [Negotiation Service]
    [Transfer Service] --> [DSP Client]
  }
  package "Data Plane Module" {
    [Dataplane Controller] --> [Dataplane Service]
    [Dataplane Service] -up--> [Transfer Service]
  }
  "DSP Catalog" -down- [Catalog Controller]
  "DSP Negotiation" -down- [Negotiation Controller]
  "DSP Transfer" -down- [Transfer Controller]
  "Data Plane Interface" -up- [Dataplane Controller]

  package "Authentication" {

    [VP Guard/Strategy] --> [Auth Service]
    [Management Guard/Strategy] --> [Auth Service]
    package "Wallets" {
      [Auth Service] --> [TSG Wallet]
      [Auth Service] -->[Managed Identity Wallet]
    }
  }
  "Dataspace Protocol Module" --> [Auth Service]

  package "Management" {
    [Catalog Mgmt] -up-> [DSP Client]
    [Negotiation Mgmt] -up-> [Negotiation Service]
    [Transfer Mgmt] -up-> [Transfer Service]
  }
  "Catalog Mgmt Interface" -up- [Catalog Mgmt]
  "Negotiation Mgmt Interface" -up- [Negotiation Mgmt]
  "Transfer Mgmt Interface" -up- [Transfer Mgmt]


}

node "Data Plane" {
  "Dataplane Service" -down---> "Start"
}
node "Wallet" {
  "TSG Wallet" --down---> "Presentation Interface"
  "TSG Wallet" --down---> "Validation Interface"
  "Managed Identity Wallet" --down---> "Presentation Interface"
  "Managed Identity Wallet" --down---> "Validation Interface"
}
"Data Plane" ..> "Data Plane Interface" : use
"External Connector" ..> "DSP Catalog" : use
"External Connector" ..> "DSP Negotiation" : use
"External Connector" ..> "DSP Transfer" : use
```

The interfaces of the control plane are largely covered by the OpenAPI descriptions in `resources/apis` and the accompanying schemas in `resources/schemas`.
