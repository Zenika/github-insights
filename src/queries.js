const httpie = require('httpie')
const { gql } = require('apollo-boost')
const client = require('./graphql.js')

const githubId = process.env.GITHUB_ID
const githubToken = process.env.GITHUB_OAUTH

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

async function getRepositoriesByUser(login, cursor, field) {
  const response = await client
    .query({
      query: gql`
        {
          ${field}(login: "${login}") {
            repositories(first: 100${cursor !== '' ? `, after: "${cursor}"` : ''}, isFork: false, isLocked: false) {
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
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      `
    })
  return response
}

async function getMembersByOrganization(organization, cursor) {
  const response = await client
    .query({
      query: gql`
        {
          organization(login: "${organization}") {
            membersWithRole(first: 100${cursor !== '' ? `, after: "${cursor}"` : ''}) {
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
  return response
}

module.exports = {
  getRateLimit,
  getRepositoryContributors,
  getRepositoriesByUser,
  getMembersByOrganization,
}
