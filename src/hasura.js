const fetch = require('node-fetch')
const { default: ApolloClient, gql } = require('apollo-boost')

require('dotenv').config()

const graphQlClient = new ApolloClient({
  uri: process.env.HASURA_GRAPHQL_URL,
  headers: {
    'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
  },
  fetch,
})

const convertRepositoryToGraphQlInput = ({
  name,
  url,
  stargazers,
  primaryLanguage,
  contributors = [],
}) => ({
  name,
  stars: stargazers.totalCount,
  url,
  primary_language: primaryLanguage && {
    data: {
      id: primaryLanguage.id,
      name: primaryLanguage.name,
    },
    on_conflict: {
      constraint: 'programming_language_pkey',
      update_columns: ['name'],
    },
  },
  contributors: {
    data: contributors.map(({ total, author }) => ({
      owner: {
        data: {
          login: author.login,
        },
        on_conflict: {
          constraint: 'owners_pkey',
          update_columns: ['login'],
        },
      },
      contribution_count: total,
    })),
  },
})

const convertMemberToGraphQlInput = ({
  login,
  name,
  repositories,
  contributionsCollection,
}) => ({
  owner: {
    data: {
      login,
    },
    on_conflict: {
      constraint: 'owners_pkey',
      update_columns: ['login'],
    },
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
        contributionsCollection.totalRepositoryContributions,
    },
  },
  repositories: {
    data: repositories.map(convertRepositoryToGraphQlInput),
  },
})

const convertOrganizationToGraphQlInput = ({
  name,
  members,
  repositories,
}) => ({
  owner: {
    data: {
      login: name,
    },
    on_conflict: {
      constraint: 'owners_pkey',
      update_columns: ['login'],
    },
  },
  repositories: { data: repositories.map(convertRepositoryToGraphQlInput) },
  members: { data: members.map(convertMemberToGraphQlInput) },
})

const insertOrganizations = (client, organizationInputs) => {
  console.log(organizationInputs)
  return client.mutate({
    mutation: gql`
      mutation insertOrganization(
        $organizations: [organization_insert_input!]!
      ) {
        insert_organization(objects: $organizations) {
          affected_rows
        }
      }
    `,
    variables: {
      organizations: organizationInputs,
    },
  })
}

const loadJsons = (names, { directory } = {}) => {
  return names
    .map(name => `../data/${directory ? `${directory}/` : ''}${name}.json`)
    .map(jsonFilePath => {
      try {
        return require(jsonFilePath)
      } catch (err) {
        console.warn(`could not open ${jsonFilePath}`)
        return null
      }
    })
    .filter(jsonOrNull => jsonOrNull)
}

require('yargs')
  .command(
    'hasura',
    '',
    {
      organization: {
        alias: 'o',
        default: process.env.GITHUB_ORGA,
      },
    },
    async argv => {
      const organizations = !Array.isArray(argv.organization)
        ? [argv.organization]
        : argv.organization
      await insertOrganizations(
        graphQlClient,
        loadJsons(organizations, { directory: 'organizations' }).map(
          ({ name, members, repositories }) =>
            convertOrganizationToGraphQlInput({
              name,
              members: loadJsons(members.map(member => member.login)),
              repositories,
            }),
        ),
      )
    },
  )
  .help().argv
