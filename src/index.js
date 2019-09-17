(async function() {
  require('dotenv').config()
  const ProgressBar = require('progress')

  const {
    getRateLimit,
    getRepositoryContributors,
    getRepositoriesByLogin,
    getMembersByOrganization,
    getUserContributions,
  } = require('./queries.js')
  const { sleep, createDataFolder, writeMember, writeMembers, writeOrganization } = require('./utils')

  const githubId = process.env.GITHUB_ID
  const githubToken = process.env.GITHUB_OAUTH
  const githubOrganization = process.argv[2] || process.env.GITHUB_ORGA

  createDataFolder()

  let members
  members = await getMembersByOrganization(githubOrganization)
  writeMembers(members)
  console.log(`Numbers of members: ${members.length}`)

  const bar = new ProgressBar('downloading [:bar] :login (:percent)', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: members.length
  })

  for (member of members) {
    await sleep(25)
    const contributionsCollection = await getUserContributions(member.login)

    await sleep(25)
    let repositories = []
    bar.tick({ login: member.login })

    repositories = await getRepositoriesByLogin(member.login, 'user')

    for(repository of repositories) {
      await sleep(25)
      const contributors = await getRepositoryContributors(repository.owner.login, repository.name)
      repository.contributors = !contributors ? [] : contributors.map(({ weeks, ...contributor }) => contributor)
    }

    writeMember({ ...member, repositories, contributionsCollection  })
  }

  writeOrganization(await getRepositoriesByLogin(githubOrganization, 'organization'))
})()
