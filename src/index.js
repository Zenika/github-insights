(async function() {
  const config = require('dotenv').config()
  const fs = require('fs')
  const path = require('path')
  const ProgressBar = require('progress')

  const { getRateLimit, getRepositoryContributors, getRepositoriesByUser, getMembersByOrganization } = require('./queries.js')
  const client = require('./graphql.js')

  const githubId = process.env.GITHUB_ID
  const githubToken = process.env.GITHUB_OAUTH
  const githubOrganization = process.argv[2] || process.env.GITHUB_ORGA
  const rootDir = '../data'

  if (!fs.existsSync(path.join(__dirname, rootDir))) {
    fs.mkdirSync(path.join(__dirname, rootDir), {},  (err) => {
      if (err) throw err;
    })
  }

  let members
  try {
    members = await getMembers()
    fs.writeFileSync(path.join(__dirname, rootDir, 'members.json'), JSON.stringify(members, undefined, 2))
  } catch(e) {
    console.error(e)
    console.error('Error while fetching members', JSON.stringify(e, undefined, 2))
    process.exit(0)
  }
  console.log(`Numbers of members: ${members.length}`)
  const membersInError = []
  const getOrganizationRepositories = makeGetRepositories('organization')
  const getMemberRepositories = makeGetRepositories('user')

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
      repositories = await getMemberRepositories(member.login)
    } catch (e) {
      console.error(e)
      membersInError.push(member.login)
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

    fs.writeFileSync(path.join(__dirname, rootDir, `${member.login}.json`), JSON.stringify(
      { ...member, repositories },
      undefined,
      2,
    ))
  }

  if (membersInError.length) {
    console.error(`Oups, something went wrong for some members. Please refer to ${path.join(__dirname, rootDir, 'membersInError.json')}`)
    fs.writeFileSync(path.join(__dirname, rootDir, 'membersInError.json'), JSON.stringify(membersInError, undefined, 2))
  }

  let organization = []
  try {
    organization = await getOrganizationRepositories(githubOrganization)
  } catch(e) {
    console.error(`Can't retrieve organization data`)
  }

  fs.writeFileSync(path.join(__dirname, rootDir, 'organization.json'), JSON.stringify(organization, undefined, 2))

  function makeGetRepositories(field) {
    return async function (login) {
      let result = []
      let repositoriesEdges = []

      do {
        const repositoriesCursor = repositoriesEdges.length ? repositoriesEdges[repositoriesEdges.length - 1].cursor : null

        await sleep(25)

        const response = await getRepositoriesByUser(login, repositoriesCursor, field) 

        repositoriesEdges = response.data[field].repositories.edges
        if (repositoriesEdges.length) {
          const currentBatch = repositoriesEdges.map(edge => edge.node)
          result = [...result, ...currentBatch]
        }
      } while(repositoriesEdges.length > 0)

      return result
    }
  }

  async function getMembers() {
    let result = []
    let membersEdges = []

    do {
      const membersCursor = membersEdges.length ? membersEdges[membersEdges.length - 1].cursor : null
      await sleep(25)
      const response = await getMembersByOrganization(githubOrganization, membersCursor)

      membersEdges = response.data.organization.membersWithRole.edges
      if (membersEdges.length) {
        const currentBatch = membersEdges.map(edge => edge.node)
        result = [...result, ...currentBatch]
      }
    } while(membersEdges.length > 0)

    return result
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})()
