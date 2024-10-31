import { exec } from "child_process";
import axios from "axios";

export function execPromise(command, options = { encoding: "UTF-8" }) {
  return new Promise(function (resolve, reject) {
    exec(command, options, (error, stdout, stderr) => {
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
  } catch (e) {
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
