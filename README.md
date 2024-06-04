# Control Plane

This repository contains the code for the control plane as specified by the Dataspace Protocol. It is a repository containing the frontend, backend and common types in Typescript. The backend uses the NestJS framework, the fronted uses Vue3, and specificially the PrismaVue package.

The package is setup as a pnpm workspace. This means you can run the frontend and backend simultaneously with the following command:

```
pnpm run dev --parallel
```

## Docker build

To build both the Frontend, Backend & libs in a single Docker image run:

```
docker build -t control-plane .
```

Then run it:

```
docker run -p 3000:3000 control-plane
```

And visit http://localhost:3000 to view the control plane.

## Development

For development purpose, you can run the following commands in the root folder to start both frontend & backend in the dev mode:

```
pnpm dev:backend
```

```
pnpm dev:frontend
```

You can run both in one terminal (using pnpm dev) but you'd miss the logs from one of them.

If you want to test interactions between control planes excecute the following commands to generate a second instance:

```
CONFIG_PATH=$(pwd)/apps/backend/config_local.yaml pnpm dev:backend
```

```
BACKEND=http://localhost:3002 pnpm dev:frontend
```

# TSG Wallet

This repository contains an implementation of a SSI DID Web wallet aimed at providing the technical means for connectors in a data space to manage credentials and request verifiable credentials.

The repository is composed of a `backend` and `frontend` application that are combined into a single Docker image.

## Configuration

The configuration for the Wallet can be provided primarily as file in `json`, `yaml`, or `toml` following the structure that is provided in `backend/src/config.ts` where `RootConfig` is the starting point for the configuration. The file must be named `config.{json,yaml,toml}` and must be located in the current directory (in the Docker image `/app/backend`) or any parent directory, for example a YAML config in the Docker image it could be one of `/app/backend/config.yaml`, `/app/config.yaml`, or `/config.yaml`.
Additionally environment variables can be provided to override specific properties. For environment variables the following transformation rules are used: (1) double underscores denote separators, (2) capitalization of environment variables is ignored, (3) keys are transformed from snake case to camel case. For example, the environment variable `SERVER__PUBLIC_DOMAIN` and `server__public_domain` override `server.publicDomain`.

The primary configuration blocks of the wallet are:
| Key | Required | Class | Description |
| --- | --- | --- | --- |
| `db` | Y | `SQLiteConfig \| PostgresConfig` | Database configuration for either SQLite or Postgres |
| `server` | N | `ServerConfig` | Primary web server configuration and public available addresses |
| `mail` | N | `MailConfig` | Mail configuration for user registration and password resetting |
| `initClients` | N | `InitClientConfig[]` | Initial clients configured for the wallet, if none provided an administrative user is generated with credentials logged to standard out |
| `initKeys` | N | `InitKeyConfig[]` | Initial keys that are generated on first startup |
| `initCredentials` | N | `InitCredentialConfig[]` | Initial credentials that are issued on first startup |
| `trustAnchors` | N | `TrustAnchorConfig[]` | Trust anchor configuration used for validation of external VPs |
| `contexts` | N | `JsonLdContextConfig[]` | Supported credential contexts with optional JSON schema |

An example configuration can be found in `backend/config.yaml`

> _Note_: This section will cover all the configuration options in the future.

## Building & testing locally

To build and test the wallet locally, first you have to decide which portion of the wallet you'd want to test.

### Dependencies

The wallet is built via pnpm, first install all dependencies:

```
pnpm install
```

### Backend

To compile the typescript files into javascript and watch the wallet backend:

```
pnpm --filter backend watch
```

> _Note_: The wallet backend will run by default on port `3000`

### Frontend

To compile the typescript files into javascript and watch the wallet frontend:

```
pnpm --filter frontend dev
```

> _Note_: The Vite serve by default runs on port `5173`, but will try subsequent ports if they are already used.

Compiling the frontend into HTML, Javascript, and CSS execute:

```
pnpm --filter frontend build
```

The build result will be located in `./apps/frontend/dist`.

### Combined backend and frontend

To test the combination of backend with embedded frontend, execute the following commands in separate terminals:

```
pnpm --filter backend watch
```

```
pnpm --filter frontend dev
```

Or build the Docker image and subsequently run the docker image:

```
docker build -t tsg-wallet .
docker run --rm -it -v ./apps/backend/config.yaml:/app/config.yaml -p 3000:3000 tsg-wallet
```

# http-data-plane

## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://ci.tno.nl/gitlab/ids/dataspace-protocol/http-data-plane.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://ci.tno.nl/gitlab/ids/dataspace-protocol/http-data-plane/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/index.html)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing(SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

---

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thank you to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name

Choose a self-explaining name for your project.

## Description

Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges

On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals

Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation

Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage

Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support

Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap

If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing

State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment

Show your appreciation to those who have contributed to the project.

## License

For open source projects, say how it is licensed.

## Project status

If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
