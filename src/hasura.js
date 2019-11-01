const fetch = require('node-fetch')
const { default: ApolloClient, gql } = require('apollo-boost')

const organizationName = process.env.GITHUB_ORGA

if (!organizationName) {
  console.log('please env var GITHUB_ORGA')
  process.exit(1)
}

const client = new ApolloClient({
  uri: process.env.HASURA_GRAPHQL_URL,
  headers: {
    'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET
  },
  fetch
})

const repositoryMapper = ({
  name,
  url,
  stargazers,
  primaryLanguage,
  contributors = []
}) => ({
  name,
  stars: stargazers.totalCount,
  url,
  primary_language: primaryLanguage && {
    data: {
      id: primaryLanguage.id,
      name: primaryLanguage.name
    },
    on_conflict: {
      constraint: 'programming_language_pkey',
      update_columns: ['name']
    }
  },
  contributors: {
    data: contributors.map(({ total, author }) => ({
      owner: {
        data: {
          login: author.login
        },
        on_conflict: {
          constraint: 'owners_pkey',
          update_columns: ['login']
        }
      },
      contribution_count: total
    }))
  }
})

const organizationRepositories = require('../data/organization.json')

const organizationRepositoryInputs = organizationRepositories.map(
  repositoryMapper
)

const organizationMembers = require('../data/members.json')

const organizationMemberInputs = organizationMembers
  .map(({ login }) => {
    try {
      return require(`../data/${login}.json`)
    } catch (err) {
      return null
    }
  })
  .filter(jsonOrNull => jsonOrNull)
  .map(({ login, name, repositories, contributionsCollection }) => ({
    owner: {
      data: {
        login
      },
      on_conflict: {
        constraint: 'owners_pkey',
        update_columns: ['login']
      }
    },
    name,
    contribution_stats: {
      data: {
        total_issue_contributions:
          contributionsCollection.totalIssueContributions,
        total_commit_contributions:
          contributionsCollection.totalCommitContributions,
        total_pull_request_contributions:
          contributionsCollection.totalPullRequestContributions,
        total_pull_request_review_contributions:
          contributionsCollection.totalPullRequestReviewContributions,
        total_repository_contributions:
          contributionsCollection.totalRepositoryContributions
      }
    },
    repositories: {
      data: repositories.map(repositoryMapper)
    }
  }))

client.mutate({
  mutation: gql`
    mutation insertOrganization(
      $organizationName: String!
      $organizationRepositories: repository_arr_rel_insert_input
      $organizationMembers: member_arr_rel_insert_input
    ) {
      insert_organization(
        objects: [
          {
            owner: {
              data: { login: $organizationName }
              on_conflict: { constraint: owners_pkey, update_columns: [login] }
            }
            repositories: $organizationRepositories
            members: $organizationMembers
          }
        ]
      ) {
        affected_rows
      }
    }
  `,
  variables: {
    organizationName,
    organizationRepositories: { data: organizationRepositoryInputs },
    organizationMembers: { data: organizationMemberInputs }
  }
})
