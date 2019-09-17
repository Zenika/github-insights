const httpie = require('httpie')
const { gql } = require('apollo-boost')

const client = require('./graphql.js')
const { sleep } = require('./utils.js')

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

const GET_USER_CONTRIBUTONS_QUERY = gql`
  query getUserContributions($login: String!){
    user(login: $login) { 
      contributionsCollection {
        totalIssueContributions
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoryContributions
      }
    }
  }
`

async function getUserContributions(login) {
  const response = await client
    .query({
      query: GET_USER_CONTRIBUTONS_QUERY,
      variables: {
        login,
      },
    })
  return response.data.user.contributionsCollection
}

const makeGetRepositoryQuery = field => gql`
  query getRepositories($login: String!, $cursor: String) {
    ${field}(login: $login) {
      repositories(first: 100, after: $cursor, isFork: false, isLocked: false) {
        nodes {
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
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`

async function getRepositoriesByLogin(login, field) {
  let result = []
  let pageInfo = {}

  do {
    sleep(25)
    const response = await client
      .query({
        query: makeGetRepositoryQuery(field),
        variables: {
          login,
          cursor: pageInfo.endCursor,
        },
      })
  
    result.push(...response.data[field].repositories.nodes)

    pageInfo = response.data[field].repositories.pageInfo
  } while(pageInfo.hasNextPage)

  return result
}

const GET_MEMBERS_BY_ORGANISATION_QUERY = gql`
  query getMembersByOrganization($organization: String!, $cursor: String) {
    organization(login: $organization) {
      membersWithRole(first: 100, after: $cursor) {
        nodes {
          login
          name
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`

async function getMembersByOrganization(organization) {
  let result = []
  let pageInfo = {}
  
  do {
    sleep(25)
    const response = await client
      .query({
        query: GET_MEMBERS_BY_ORGANISATION_QUERY,
        variables: {
          cursor: pageInfo.endCursor,
          organization,
        }
      })

    result = [...result, ...response.data.organization.membersWithRole.nodes]

    pageInfo = response.data.organization.membersWithRole.pageInfo
  } while (pageInfo.hasNextPage)

  return result
}

module.exports = {
  getRateLimit,
  getRepositoryContributors,
  getRepositoriesByLogin,
  getMembersByOrganization,
  getUserContributions,
}
