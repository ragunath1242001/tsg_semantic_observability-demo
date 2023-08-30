# TSG Wallet Usage

This documentation is focussed on the usage of the wallet from the perspective of a connector, management of the Wallet is handled via the frontend.

The commands assume the wallet is reachable at `http://localhost:3000/` with an client with ID `connector` and secret `connector-secret` with at least the `view_presentations` role.

## Request Verifiable Presentation

To request a verifiable presentation, first request an access token at the wallet:
```bash
curl --location 'http://localhost:3000/api/auth/login' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_id=connector' \
  --data-urlencode 'client_secret=connector-secret'
```

The HTTP response should be similar to:
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Store the `access_token` for usage in the remainder of the calls.

The request the verifiable presentation as JWT:
With parameters:
- Credential ID: `did:web:localhost%3A3000#credential`
- Format as JWT: `true`
- Audience: `did:web:AUDIENCE`
```bash
curl --location 'http://localhost:3000/api/presentations?credentialId=did%3Aweb%3Alocalhost%253A3000%23credential&asJwt=true&audience=did%3Aweb%3AAUDIENCE' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```
> _Note_: parameters `credentialId` & `audience` might require URL encoding

The HTTP response should be similar to:
```json
{
    "vp": "eyJhbGciOiJFUzM4NCJ9..."
}
```

This verifiable presentation in JWT format can now be exchanged with other connectors.

## Validate Verifiable Presentation

For verification of verifiable presentations the following request can be made:
```bash
curl --location 'http://localhost:3000/api/presentations/validate' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--data '{"vp":"eyJhbGciOiJFUzM4NCJ9...."}'
```

The HTTP response should be similar to:
```json
{
    "vp": "eyJhbGciOiJFUzM4NCJ9...",
    "valid": true,
    "validateExpiryDate": [
        true
    ],
    "validateCredentials": [
        true
    ],
    "validateTrustAnchors": [
        true
    ],
    "validateJWTSignature": true,
    "validateJWTExpiryDate": true
}
```

Where the fields are:
- `vp`: the original VP JWT requested
- `valid`: summary of the validation of the VP
- `validateExpiryDate`: list of booleans indicating whether the credentials in the VP are still within their expiry date
- `validateCredentials`: list of booleans indicating whether the format and signature of the credential is valid
- `validateTrustAnchors`: list of booleans indicating whether the issued credential types match the trust anchor configuration
- `validateJWTSignature`: validation of the JWT signature by one of the keys provided in the DID document of the holder
- `validateJWTExpiryDate`: validation whether the JWT is still within its expiry date

Normally, checking only the `valid` property should be sufficient. But in case exceptions are made certain validations can be ignored.