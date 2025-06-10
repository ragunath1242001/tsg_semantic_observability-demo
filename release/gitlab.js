import axios from "axios";
import { exec } from "child_process";

export function execPromise(command, options = { encoding: "UTF-8" }) {
  return new Promise(function (resolve, reject) {
    exec(command, options, (error, stdout, _stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

export async function setConfig(email, name) {
  console.log(`Setting Git config to ${email} - ${name}`);
  await execPromise(`git config user.email "${email}"`);
  await execPromise(`git config user.name "${name}"`);
}

export async function setRemote() {
  await execPromise(
    `git remote add gitlab_origin https://semantic-release:${process.env.GITLAB_TOKEN}@${process.env.CI_SERVER_HOST}/${process.env.CI_PROJECT_PATH}.git`
  );
}

export async function commitChanges(client, version) {
  console.log(`Committing changes`);
  await client.commit({ message: `chore: release v${version}` });
  console.log(`Pushing changes`);
  await execPromise(`git push gitlab_origin HEAD:main -o ci.skip`);
}

export async function createRelease(newVersion, changelog) {
  console.log(`Creating release`);
  try {
    await axios.post(
      `${process.env.CI_API_V4_URL}/projects/${process.env.CI_PROJECT_ID}/releases`,
      {
        name: `v${newVersion}`,
        tag_name: `v${newVersion}`,
        description: changelog,
        ref: "main"
      },
      {
        headers: {
          "PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Created release");
  } catch (error) {
    console.error("Error creating release");
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);
    }
  }
}

export async function replaceVersion(oldVersion, newVersion, debug = false) {
  console.log(`Replacing deployment version ${oldVersion} with ${newVersion}`);
  // pull deployments repo from gitlab

  if (!debug) {
    await execPromise(
      `git clone https://semantic-release:${process.env.DEPLOYMENTS_TOKEN}@${process.env.CI_SERVER_HOST}/deployments.git`
    );
    // replace version in argocd repo
    await execPromise(
      `cd deployments && find . -type f -name "*.yaml" -exec sed -i '' -e "s/v${oldVersion}/v${newVersion}/g" -e "s/\\([^v]\\)${oldVersion}/\\1${newVersion}/g" {} +`
    );
    // commit changes
    await execPromise(
      `git remote add deployments_origin https://semantic-release:${process.env.DEPLOYMENTS_TOKEN}@${process.env.CI_SERVER_HOST}/deployments.git`
    );
    await execPromise(`git add .`);
    await execPromise(`git commit -m "chore: release v${newVersion}"`);
    // push changes to deployments repo
    await execPromise(`git push deployments_origin HEAD:main`);
  } else {
    console.log("DEBUG: Not committing changes to deployments repo");
    console.log("DEBUG: Not pushing changes");
  }
}
