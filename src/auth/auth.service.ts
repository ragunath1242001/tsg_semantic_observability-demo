import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync, writeFile } from 'fs';
import { pki } from 'node-forge';
import { importX509, exportJWK } from 'jose';
import { join } from 'path';

@Injectable()
export class DidService implements OnModuleInit {
    async onModuleInit(): Promise<void> {
        await this.createDID()
        await this.createParticipant()
    }

    generatePemCertificate() {
        const keys = pki.rsa.generateKeyPair(2048);
        const certificate = pki.createCertificate();
        certificate.publicKey = keys.publicKey;
        certificate.serialNumber = '01';
        certificate.validity.notBefore = new Date();
        certificate.validity.notAfter = new Date();
        certificate.validity.notAfter.setFullYear(certificate.validity.notBefore.getFullYear() + 1);
        // TODO obtain from values
        const attributes = [{
            name: 'commonName',
            value: 'localhost'
        }, {
            name: 'countryName',
            value: 'NL'
            }, {
            shortName: 'ST',
            value: 'Groningen'
            }, {
            name: 'localityName',
            value: 'Groningen'
            }, {
            name: 'organizationName',
            value: 'TNO'
            }, {
            shortName: 'OU',
            value: 'DE'
            }];
        certificate.setSubject(attributes);
        certificate.setIssuer(attributes);
        certificate.sign(keys.privateKey);
        return pki.certificateToPem(certificate);
    }

    async createDID(): Promise<void> {
        if (!existsSync(join(process.cwd(),'src/auth/did.json'))) {
            const algorithm = 'PS256'
            const certificate = this.generatePemCertificate()
            const x509 = await importX509(certificate, algorithm)
            const publicKeyJwk = await exportJWK(x509)
            publicKeyJwk.alg = algorithm
            publicKeyJwk.x5u = 'http://localhost/.well-known/x509CertificateChain.pem'
            const did = {
                '@context': ['https://www.w3.org/ns/did/v1'],
                id: 'did:web:localhost#X509',
                verificationMethod: [
                  {
                    '@context': 'https://w3c-ccg.github.io/lds-jws2020/contexts/v1/',
                    id: 'did:web:localhost#X509',
                    type: 'JsonWebKey2020',
                    controller: 'did:web:localhost',
                    publicKeyJwk,
                  },
                ],
                assertionMethod: ['did:web:localhost#X509' + '#JWK2020-RSA'],
              }
            const data = JSON.stringify(did, null, 2)
            const filename = join(process.cwd(),'src/auth/did.json')
        
            writeFile(filename, data, {
                encoding: 'utf-8',
                flag: 'w',
                mode: 0o666
            },
                (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Created DID successfully.");
                    }
                })
            
            
        }
    }

    async createParticipant(): Promise<void> {
        if (!existsSync(join(process.cwd(),'src/auth/participant.json'))) {
            const selfDescription = {
                '@context': [
                    'https://www.w3.org/2018/credentials/v1',
                    'https://registry.gaia-x.eu/v2210/api/shape'
                ],
                'type': ['VerifiableCredential', 'LegalPerson'],
                'id': 'https://localhost:3000/.well-known/participant.json',
                'issuer': 'did:web:localhost',
                'issuanceDate': new Date().getTime(),
                'credentialSubject': {
                    'id': 'did:web:localhost',
                    'type': 'gx:LegalParticipant',
                    'gx:legalName': 'Gaia-X DPP Distributor',
                    'gx:legalRegistrationNumber': {
                        'gx:vatID': '00000000D'
                    },
                    'gx:headquarterAddress': {
                        'gx:countrySubdivisionCode': 'ES-PV'
                    },
                    'gx:legalAddress': {
                        'gx:countrySubdivisionCode': 'ES-PV'
                    },
                    'gx-terms-and-conditions:gaiaxTermsAndConditions': '70c1d713215f95191a11d38fe2341faed27d19e083917bc8732ca4fea4976700'
                }

                }
            }
        }
    }

@Injectable()
export class AuthService {
    async getDid(): Promise<string> {
        return readFileSync('src/auth/did.json', 'utf-8')
        
    }
    async getParticipant(): Promise<string> {
        return readFileSync('src/auth/participant.json', 'utf-8')
    }
}
