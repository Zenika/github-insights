(async function () {
  const config = require('dotenv').config()
  const fs = require('fs')
  const path = require('path')
  const chalk = require('chalk')

  const dataFolder = 'data'
  const statsFile = 'stats.json'
  const generateFile = !!process.argv[2]
  const stats = {}

  // Get the Gihub organization based on the .env values or the organization.json 
  stats.organization =
    process.env.GITHUB_ORGA
    || JSON.parse(fs.readFileSync(path.join(__dirname, dataFolder, 'organization.json')))[0].owner.login

  const members = fs.readdirSync(path.join(__dirname, dataFolder))
    .filter(file => !['members.json', 'organization.json', 'stats.json'].includes(file))
    .map(file => JSON.parse(fs.readFileSync(path.join(__dirname, dataFolder, file))))
  stats.totalMembers = members.length

  const membersWithRepositories = members.filter(member => member.repositories.length > 0)
  stats.membersWithRepositories = membersWithRepositories.length

  const repositories = members
    .flatMap(member => member.repositories)
  stats.totalRepositories = repositories.length

  stats.topLanguages = repositories
    .flatMap(repository => repository.primaryLanguage)
    .filter(primaryLanguage => primaryLanguage !== null)
    .flatMap(primaryLanguage => primaryLanguage.name)
    .reduce((acc, next) => {
      const index = acc.findIndex(([language]) => language === next)
      if (index === -1) {
        acc.push([next, 1])
      } else {
        const [language, count] = acc[index]
        acc[index] = [language, count + 1]
      }
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }))

  const repositoriesOwnedByMembers = membersWithRepositories
    .map(member => {
      member.repositories = member.repositories.filter(repository => repository.owner.login === member.login)
      return member
    })
    .flatMap(member => member.repositories)

  stats.topMemberRepositories = repositoriesOwnedByMembers
    .reduce((acc, next) => {
      acc.push([`${next.name} (${next.owner.login})`, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([repo, count]) => ({ repo, count }))

  const organizationRepositories = JSON.parse(fs.readFileSync(path.join(__dirname, dataFolder, 'organization.json')))
  stats.totalOrganizationRepositories = organizationRepositories.length
  stats.topOrganizationRepositories = organizationRepositories
    .reduce((acc, next) => {
      acc.push([{ ...next }, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([{ name, url, description }, count]) => ({ name, description, count, url }))
  stats.topRepositories = organizationRepositories.concat(repositoriesOwnedByMembers)
    .reduce((acc, next) => {
      acc.push([{ ...next }, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([{ name, url, description }, count]) => ({ name, description, count, url }))


  stats.topPrimaryLanguages = organizationRepositories
    .flatMap(repository => repository.primaryLanguage)
    .filter(primaryLanguage => primaryLanguage !== null)
    .flatMap(primaryLanguage => primaryLanguage.name)
    .reduce((acc, next) => {
      const index = acc.findIndex(([language]) => language === next)
      if (index === -1) {
        acc.push([next, 1])
      } else {
        const [language, count] = acc[index]
        acc[index] = [language, count + 1]
      }
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }))

  stats.topContributors = members
    .map(member => ({
      login: member.login,
      totalContributions: member.contributionsCollection.totalIssueContributions +
        member.contributionsCollection.totalCommitContributions +
        member.contributionsCollection.totalPullRequestContributions +
        member.contributionsCollection.totalPullRequestReviewContributions +
        member.contributionsCollection.totalRepositoryContributions
    }))
    .sort((a, b) => b.totalContributions - a.totalContributions)
    .slice(1, 11)

  stats.totalContributions = members
    .map(member => member.contributionsCollection.totalIssueContributions +
        member.contributionsCollection.totalCommitContributions +
        member.contributionsCollection.totalPullRequestContributions +
        member.contributionsCollection.totalPullRequestReviewContributions +
        member.contributionsCollection.totalRepositoryContributions
    )
    .reduce((acc, next) => acc + next, 0) 

  if (generateFile) {
    try {
      fs.writeFileSync(path.join(__dirname, dataFolder, statsFile), JSON.stringify(stats, undefined, 2))
      console.log(chalk`{green Stats file for ${stats.organization} has been generated in /data/stats.json 📄}`)
    } catch (e) {
      console.error('Error while generating stats file', JSON.stringify(e, undefined, 2))
      process.exit(0)
    }
  } else {
    console.log(chalk`
      {bold.red.bgWhite ${stats.organization}}
      Members: {blue ${stats.totalMembers}}
      With repositories: {blue ${stats.membersWithRepositories}}
      Organization repositories: {blue ${stats.totalOrganizationRepositories}}
      Total contributions: {blue ${stats.totalContributions}}
      Organization top languages:\r\n{blue ${stats.topPrimaryLanguages.map(({ language, count }) => `\t- ${language}: ${count}`).join('\r\n')}}
      Top contributors:\r\n{blue ${stats.topContributors.map(({ login, totalContributions }) => `\t- ${login}: ${totalContributions}`).join('\r\n')}}
      Organization top repositories:\r\n{blue ${stats.topOrganizationRepositories.map(({ name, count }) => `\t- ${name}: ${count} ⭐️`).join('\r\n')}}
      Top repositories:\r\n{blue ${stats.topRepositories.map(({ name, count }) => `\t- ${name}: ${count} ⭐️`).join('\r\n')}}
      ${stats.organization} members repositories: {blue ${stats.totalRepositories}}
      Top languages:\r\n{blue ${stats.topLanguages.map(({ language, count }) => `\t- ${language}: ${count}`).join('\r\n')}}
      Top ${stats.organization} members repositories:\r\n{blue ${stats.topMemberRepositories.map(({ repo, count }) => `\t- ${repo}: ${count} ⭐️`).join('\r\n')}}`)
  }

})()

