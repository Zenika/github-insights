const fetch = require('node-fetch')
const { gql } = require('apollo-boost')

const client = require('./graphql.js')
const { sleep } = require('./utils.js')

const githubId = process.env.GITHUB_ID
const githubToken = process.env.GITHUB_OAUTH

async function getRateLimit() {
  const response = await client.query({
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
    `,
  })
  return response.data.rateLimit
}

async function getRepositoryContributors(owner, repository) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repository}/stats/contributors?access_token=${githubToken}`,
      { headers: { 'User-Agent': githubId } },
    )
    if (!res.ok) {
      throw res
    }
    if (res.status === 204) {
      return []
    }
    return res.json()
  } catch (e) {
    console.log(e)
    process.exit(0)
  }
}

const GET_USER_CONTRIBUTONS_QUERY = gql`
  query getUserContributions($login: String!) {
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
  const response = await client.query({
    query: GET_USER_CONTRIBUTONS_QUERY,
    variables: {
      login,
    },
  })
  return response.data.user.contributionsCollection
}

const GET_REPOSITORIES_BY_USER_QUERY = gql`
  query getRepositoriesByUser($login: String!, $cursor: String) {
    user(login: $login) {
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

async function getRepositoriesByUser(login) {
  const result = []
  let pageInfo = {}

  do {
    sleep(25)
    const response = await client.query({
      query: GET_REPOSITORIES_BY_USER_QUERY,
      variables: {
        login,
        cursor: pageInfo.endCursor,
      },
    })

    const repositories = response.data.user.repositories
    result.push(...repositories.nodes)

    pageInfo = repositories.pageInfo
  } while (pageInfo.hasNextPage)

  return result
}

const GET_REPOSITORIES_BY_ORGANIZATION_QUERY = gql`
  query getRepositoriesByOrganization($login: String!, $cursor: String) {
    organization(login: $login) {
      repositories(first: 100, after: $cursor, isFork: false, isLocked: false) {
        nodes {
          name
          description
          url
          primaryLanguage {
            id
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

async function getRepositoriesByOrganization(login) {
  const result = []
  let pageInfo = {}

  do {
    sleep(25)
    const response = await client.query({
      query: GET_REPOSITORIES_BY_ORGANIZATION_QUERY,
      variables: {
        login,
        cursor: pageInfo.endCursor,
      },
    })

    const repositories = response.data.organization.repositories
    result.push(...repositories.nodes)

    pageInfo = repositories.pageInfo
  } while (pageInfo.hasNextPage)

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
  const result = []
  let pageInfo = {}

  do {
    sleep(25)
    const response = await client.query({
      query: GET_MEMBERS_BY_ORGANISATION_QUERY,
      variables: {
        cursor: pageInfo.endCursor,
        organization,
      },
    })

    const membersWithRole = response.data.organization.membersWithRole
    result.push(...membersWithRole.nodes)

    pageInfo = membersWithRole.pageInfo
  } while (pageInfo.hasNextPage)

  return result
}

module.exports = {
  getRateLimit,
  getRepositoryContributors,
  getRepositoriesByUser,
  getRepositoriesByOrganization,
  getMembersByOrganization,
  getUserContributions,
}
