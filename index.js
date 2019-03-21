(async function() {
  const config = require('dotenv').config()
  const httpie = require('httpie')
  const fs = require('fs')
  const path = require('path')
  const { default: ApolloClient, gql } = require('apollo-boost')
  const ProgressBar = require('progress')

  const githubId = process.env.GITHUB_ID
  const githubToken = process.env.GITHUB_OAUTH
  const githubOrganization = process.env.GITHUB_ORGA || process.argv[2]
  const rootDir = 'data'

  if (!fs.existsSync(path.join(__dirname, rootDir))) {
    fs.mkdirSync(path.join(__dirname, rootDir), {},  (err) => {
      if (err) throw err;
    })
  }

  const client = new ApolloClient({
    uri: `https://api.github.com/graphql?access_token=${githubToken}`,
    fetch: async (uri, options) => {
      const { method } = options
      options.family = 4
      options.headers = {
        ...options.headers,
        'User-Agent': githubId
      }
      const res = await httpie.send(method, uri, options)
      return {
        text: async () => JSON.stringify(res.data),
        json: async () => res.data,
      }
    },
  })

  let members
  try {
    members = await getMembers()
    fs.writeFileSync(path.join(__dirname, rootDir, 'members.json'), JSON.stringify(members, undefined, 2))
  } catch(e) {
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
      membersInError.push(member.login)
      continue
    }

    for(repository of repositories) {
      await sleep(25)
      try {
        repository.contributors = await getRepositoryContributors(repository.owner.login, repository.name)
      } catch(e) {
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

  async function getRateLimit() {
    const response = await client
      .query({
        query: gql`
          {
            rateLimit {
              limit
              cost
              resetAt
              remaining
              nodeCount
            }
          }
        `
      })
    return response.data.rateLimit
  }

  async function getRepositoryContributors(owner, repository) {
    try {
      const res = await httpie.send(
        'GET',
        `https://api.github.com/repos/${owner}/${repository}/stats/contributors?access_token=${githubToken}`,
        { headers: { 'User-Agent': githubId } }
      )
      return res.data
    } catch(e) {
      console.log(e)
      process.exit(0)
    }
  }

  function makeGetRepositories(field) {
    return async function (login) {
      let result = []
      let repositoriesEdges = []

      do {
        const repositoriesCursor = repositoriesEdges.length ? repositoriesEdges[repositoriesEdges.length - 1].cursor : ''

        await sleep(25)

        const response = await client
          .query({
            query: gql`
              {
                ${field}(login: "${login}") {
                  repositories(first: 100${repositoriesCursor !== '' ? `, after: "${repositoriesCursor}"` : ''}, isFork: false, isLocked: false) {
                    edges {
                      node {
                        name
                        description
                        url
                        primaryLanguage {
                          name
                        }
                        stargazers {
                          totalCount
                        }
                        owner {
                          login
                        }
                      }
                      cursor
                    }
                  }
                }
              }
            `
          })

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
      const membersCursor = membersEdges.length ? membersEdges[membersEdges.length - 1].cursor : ''
      await sleep(25)
      const response = await client
        .query({
          query: gql`
            {
              organization(login: "${githubOrganization}") {
                membersWithRole(first: 100${membersCursor !== '' ? `, after: "${membersCursor}"` : ''}) {
                  edges {
                    node {
                      login
                      name
                    }
                    cursor
                  }
                }
              }
            }
          `
        })

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
