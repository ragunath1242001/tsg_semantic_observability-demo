---
sidebar_label: 'Compliance'
---
# Compliance with the Dataspace Protocol

The TSG Control Plane is automatically tested against the [Dataspace Protocol TCK](https://github.com/eclipse-dataspacetck/dsp-tck).

The `dsp-tck-fetch` job in the CI/CD pipeline fetches the TCK Docker image and stores the TCK runtime JAR in the `tools/e2e-testing/assets` directory via a Gitlab CI artifact. The TCK runtime is then used in the `e2e-dsp-tck` job to run the tests against the TSG Control Plane.

The configuration of the TCK is stored in the [`tools/e2e-testing/assets/dsp.tck.properties`](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/blob/main/tools/e2e-testing/assets/dsp.tck.properties) file. The configuration is used to configure the TCK to run against the TSG Control Plane. The test setup and cases of the TSG Control Plane are located in the [`tools/e2e-testing/lib/dsp-tck`](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/blob/main/tools/e2e-testing/lib/dsp-tck) directory.

## Latest official run

The latest official run of the TCK against the TSG Control Plane can be found in the [GitLab CI/CD pipeline](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/jobs/10526613868).

- TCK Version: release `v1.0.0-RC4`. Using the `eclipsedataspacetck/dsp-tck-runtime:1.0.0-RC4` Docker image.
- TSG Configuration: commit [`0eba8fec`](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/tree/0eba8fece486715e33280d41247b37f69e36df0c/tools/e2e-testing)
- Test Output: [TCK Test Output](https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/-/jobs/10526613868)
