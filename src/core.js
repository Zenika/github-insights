const {
  getRateLimit,
  getRepositoryContributors,
  getRepositoriesByUser,
  getRepositoriesByOrganization,
  getMembersByOrganization,
  getUserContributions,
} = require('./queries.js')

const { sleep } = require('./utils.js')

const MEMBERS_LOADED = 'MEMBERS_LOADED'
const START_ENHANCING_MEMBER = 'START_ENHANCING_MEMBER'
const ENHANCING_MEMBER_DONE = 'ENHANCING_MEMBER_DONE'
const ORGANIZATION_LOADED = 'ORGANIZATION_LOADED'

async function* generateOrganizationData(githubOrganization) {
  const members = await getMembersByOrganization(githubOrganization)
  yield { type: MEMBERS_LOADED, value: members }

  for (member of members) {
    yield { type: START_ENHANCING_MEMBER, value: member.login }

    await sleep(25)
    const contributionsCollection = await getUserContributions(member.login)

    await sleep(25)
    const repositories = await getRepositoriesByUser(member.login)

    for (repository of repositories) {
      await sleep(25)
      const contributors = await getRepositoryContributors(
        repository.owner.login,
        repository.name,
      )
      if (contributors.map) {
        // seems like some repositories have empty contributors list, which trigger some weird misbehaviours
        repository.contributors = contributors.map(
          ({ weeks, ...contributor }) => contributor,
        )
      }
    }

    yield {
      type: ENHANCING_MEMBER_DONE,
      value: { ...member, repositories, contributionsCollection },
    }
  }

  const organization = await getRepositoriesByOrganization(githubOrganization)
  yield { type: ORGANIZATION_LOADED, value: organization }
}

module.exports = {
  generateOrganizationData,
  MEMBERS_LOADED,
  START_ENHANCING_MEMBER,
  ENHANCING_MEMBER_DONE,
  ORGANIZATION_LOADED,
}
