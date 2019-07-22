require('dotenv').config()

const Octokit = require('@octokit/rest')
const { promisify } = require('util')
const readFile = promisify(require('fs').readFile)

const client = new Octokit({
  auth: process.env.GITHUB_OAUTH,
  previews: ['shadow-cat'],
})

const commonPayload = {
  owner: process.env.GITHUB_ORGA,
  repo: process.env.GITHUB_WEBSITE,
}

const branch = `insights-${getDate()}`

createBranchFromMaster(client, commonPayload, branch)
  .then(() => readFile('data/stats.json', 'base64'))
  .then(content => updateFile(
    client,
    commonPayload,
    'src/data/stats.json',
    content,
    branch,
  ))
  .then(() => createPullRequest(client, {
    ...commonPayload,
    head: branch,
    title: `:card_file_box: Update stats.json ${getDate()}`,
  }))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

function createBranchFromMaster(client, payload, branch) {
  return client.repos.getBranch({
    ...payload,
    branch: 'master',
  })
  .then(branch => branch.data.commit.sha)
  .then(sha => {
    return client.git.createRef({
      ...payload,
      ref: `refs/heads/${branch}`,
      sha,
    })
  })
  .catch(() => {
    console.log(`Branch "${branch}" already exists: skip creation.`)
  })
}

function updateFile(client, payload, path, content, branch, date = getDate()) {
  return client.repos.getContents({
    ...payload,
    path,
    ref: branch,
  })
  .then(content => content.data)
  .then(({ name, sha }) => {
    const message = `:card_file_box: Update ${name} ${date}`

    return client.repos.createOrUpdateFile({
      ...payload,
      branch,
      path,
      message,
      content,
      sha,
    })
  })
}

function createPullRequest(client, payload) {
  return client.pulls.create({
    ...payload,
    base: 'master',
    draft: true,
  })
}

function getDate(date = new Date()) {
  return date.toISOString().split('T')[0]
}
