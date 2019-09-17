require('dotenv').config()

const Octokit = require('@octokit/rest')
const { promisify } = require('util')
const readFile = promisify(require('fs').readFile)

const client = new Octokit({
  auth: process.env.GITHUB_OAUTH,
  previews: ['shadow-cat'],
})

const COMMON_PAYLOAD = {
  owner: process.env.GITHUB_WEBSITE_ORGA,
  repo: process.env.GITHUB_WEBSITE,
}

const branch = `insights-${getDate()}`

createBranchFromMaster(client, branch)
  .then(() => readFile('data/stats.json', 'base64'))
  .then(content => updateFile(
    client,
    'src/data/stats.json',
    content,
    branch,
  ))
  .then(({ data }) => data.commit.message)
  .then(title => createPullRequest(client, branch, title))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

function createBranchFromMaster(client, branch) {
  return client.repos.getBranch({
    ...COMMON_PAYLOAD,
    branch: 'master',
  })
  .then(branch => branch.data.commit.sha)
  .then(sha => {
    return client.git.createRef({
      ...COMMON_PAYLOAD,
      ref: `refs/heads/${branch}`,
      sha,
    })
  })
  .catch(() => {
    console.log(`Branch "${branch}" already exists: skip creation.`)
  })
}

function updateFile(client, path, content, branch, date = getDate()) {
  return client.repos.getContents({
    ...COMMON_PAYLOAD,
    path,
    ref: branch,
  })
  .then(content => content.data)
  .then(({ name, sha }) => {
    const message = `:card_file_box: Update ${name} ${date}`

    return client.repos.createOrUpdateFile({
      ...COMMON_PAYLOAD,
      branch,
      path,
      message,
      content,
      sha,
    })
  })
}

function createPullRequest(client, head, title) {
  return client.pulls.create({
    ...COMMON_PAYLOAD,
    base: 'master',
    draft: true,
    head,
    title,
  })
}

function getDate(date = new Date()) {
  return date.toISOString().split('T')[0]
}
