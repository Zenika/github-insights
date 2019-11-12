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

async function* generateOrganizationData(githubOrganizations) {
  let members = []

  for (githubOrganization of githubOrganizations) {
    const organizationMembers = await getMembersByOrganization(githubOrganization)
    members = [...members, ...organizationMembers] 
  }

  members = filterNonUniqueBy(members, (a, b) => a.login === b.login)
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
      repository.contributors = contributors.map(
        ({ weeks, ...contributor }) => contributor,
      )
    }

    yield {
      type: ENHANCING_MEMBER_DONE,
      value: { ...member, repositories, contributionsCollection },
    }
  }

  for (githubOrganization of githubOrganizations) {
    const organization = await getRepositoriesByOrganization(githubOrganization)
    yield { type: ORGANIZATION_LOADED, value: organization, name: githubOrganization }
  }
}

const filterNonUniqueBy = (arr, fn) =>
  arr.filter((v, i) => arr.every((x, j) => (i === j) === fn(v, x, i, j)));

module.exports = {
  generateOrganizationData,
  MEMBERS_LOADED,
  START_ENHANCING_MEMBER,
  ENHANCING_MEMBER_DONE,
  ORGANIZATION_LOADED,
}
