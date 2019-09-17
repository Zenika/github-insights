(async function() {
  const config = require('dotenv').config()
  const fs = require('fs')
  const path = require('path')
  const ProgressBar = require('progress')

  const { getRateLimit, getRepositoryContributors, getRepositoriesByLogin, getMembersByOrganization } = require('./queries.js')
  const client = require('./graphql.js')
  const { sleep, createDataFolder, writeMember, writeMembers, writeOrganization } = require('./utils')

  const githubId = process.env.GITHUB_ID
  const githubToken = process.env.GITHUB_OAUTH
  const githubOrganization = process.argv[2] || process.env.GITHUB_ORGA

  createDataFolder()

  let members
  try {
    members = await getMembersByOrganization(githubOrganization)
    writeMembers(members)
  } catch(e) {
    console.error('Error while fetching members', JSON.stringify(e, undefined, 2))
    process.exit(0)
  }
  console.log(`Numbers of members: ${members.length}`)

  const bar = new ProgressBar('downloading [:bar] :login (:percent)', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: members.length
  })

  for (member of members) {
    await sleep(25)
    let repositories = []
    bar.tick({ login: member.login })
    try {
      repositories = await getRepositoriesByLogin(member.login, 'user')
    } catch (e) {
      console.error(e)
      continue
    }

    for(repository of repositories) {
      await sleep(25)
      try {
        repository.contributors = await getRepositoryContributors(repository.owner.login, repository.name)
      } catch(e) {
        console.error(e)
        membersInError.push(member.login)
        break
      }
    }

    writeMember({ ...member, repositories })
  }

  let organization = []
  try {
    organization = await getRepositoriesByLogin(githubOrganization, 'organization')
  } catch(e) {
    console.error(`Can't retrieve organization data`)
  }

  writeOrganization(organization)
})()
