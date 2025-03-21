# Scenarios

## Use Case: Key management.

**Actors**: Wallet Administrator

**Scope**: Software system

**Purpose**: Manage used keys in the Wallet

**Type**: Primary

**Overview**: As a Wallet administrator I must be able to manage the keys used in the instance

### Typical course of events:

| Actor Action                                          | System Response                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| 1. The admin logs in into the Wallet via the Admin UI | 2. The Wallet creates a user session                                 |
| 3. The admin requests a list of keys in use           | 4. The Wallet provides the list of keys without private key material |
| 5. The admin removes an existing key                  | 6. The Wallet removes the key from the database                      |
| 7. The admin creates a new key via the UI             | 8. The key material is generated based on the request of the admin   |

### Alternative Courses:

2a. The user credentials provided are not allowed to manage keys

8a. The provided configuration is not valid to create a new key

## Use Case: Credential Issuance via OID4VCI.

**Actors**: Holder Wallet Administrator (shortened to "holder"), Issuer Wallet Administrator (shortened to "issuer")

**Scope**: Software system

**Purpose**: Provide a Verifiable Credential from the issuer to the holder

**Type**: Primary

**Overview**: As a holder I want to request a new credential from the issuer

### Typical course of events:

| Actor Action                                                                                        | System Response                                                                                   |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. The holder requests a new credential from the issuer in a offline setting                        |                                                                                                   |
| 2. The issuer logs into its Wallet instance                                                         | 3. The Wallet creates a user session                                                              |
| 4. The issuer creates a Credential Offer aimed at the holder with the credential configuration      | 5. The Wallet creates the credential offer with a generated pre-authorized_code                |
| 6. The issuer shares the pre-authorized_code with the holder in a offline setting                |                                                                                                   |
| 7. The holder logs into its Wallet instance                                                         | 8. The Wallet creates a user session                                                              |
| 9. The holder provides the issuers URL and the pre-authorized_code to start the issuance process | 10. The wallet requests the issuers metadata                                                      |
|                                                                                                     | 11. The holders wallet requests an access token based on the pre-authorized_code at the issuer |
|                                                                                                     | 12. The holders wallet requests the credential                                                    |
|                                                                                                     | 13. The issuers wallet creates and signs the credential                                           |
|                                                                                                     | 14. The holders wallet receives the credential                                                    |

### Alternative Courses:

## Use Case: Credential Presentation via Control Plane

**_TODO_**
