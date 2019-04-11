(async function () {
  const config = require('dotenv').config()
  const fs = require('fs')
  const path = require('path')
  const chalk = require('chalk')

  const dataFolder = 'data'
  const statsFile = 'stats.json'
  const generateFile = !!process.argv[2]

  // Get the Gihub organization based on the .env values or the organization.json 
  const githubOrganization =
    process.env.GITHUB_ORGA
    || JSON.parse(fs.readFileSync(path.join(__dirname, dataFolder, 'organization.json')))[0].owner.login

  const members = fs.readdirSync(path.join(__dirname, dataFolder))
    .filter(file => !['members.json', 'organization.json', 'stats.json'].includes(file))
    .map(file => JSON.parse(fs.readFileSync(path.join(__dirname, dataFolder, file))))

  const membersWithRepositories = members.filter(member => member.repositories.length > 0)
  const repositoriesOwnedByMembers = membersWithRepositories
    .map(member => {
      member.repositories = member.repositories.filter(repository => repository.owner.login === member.login)
      return member
    })
    .flatMap(member => member.repositories)

  const repositories = members
    .flatMap(member => member.repositories)
  const primaryLanguages = repositories
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
  const stargazersForMembersOwnedRepositories = repositoriesOwnedByMembers
    .reduce((acc, next) => {
      acc.push([`${next.name} (${next.owner.login})`, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const topPrimaryLanguages = primaryLanguages.slice(0, 10)

  const organizationRepositories = JSON.parse(fs.readFileSync(path.join(__dirname, dataFolder, 'organization.json')))
  const topPrimaryLanguagesInOrganization = organizationRepositories
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
  const stargazersForOrganization = organizationRepositories
    .reduce((acc, next) => {
      acc.push([next.name, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (generateFile) {
    const stats = {
      organization: githubOrganization,
      totalMembers: members.length,
      membersWithRepositories: membersWithRepositories.length,
      topPrimaryLanguages: topPrimaryLanguagesInOrganization.map(([language, count]) => ({ language, count })),
      topRepositories: stargazersForOrganization.map(([repo, count]) => ({ repo, count })),
      totalRepositories: repositories.length,
      topLanguages: topPrimaryLanguages.map(([language, count]) => ({ language, count })),
      topMemberRepositories: stargazersForMembersOwnedRepositories.map(([repo, count]) => ({ repo, count }))
    }
    try {
      fs.writeFileSync(path.join(__dirname, dataFolder, statsFile), JSON.stringify(stats, undefined, 2))
      console.log(chalk`{green Stats file for ${githubOrganization} has been generated in /data/stats.json 📄}`)
    } catch (e) {
      console.error('Error while generating stats file', JSON.stringify(e, undefined, 2))
      process.exit(0)
    }
  } else {
    console.log(chalk`
      {bold.red.bgWhite ${githubOrganization}}
      Members: {blue ${members.length}}
      With repositories: {blue ${membersWithRepositories.length}}
      Organization repositories: {blue ${organizationRepositories.length}}
      Organization top languages:\r\n{blue ${topPrimaryLanguagesInOrganization.map(([language, count]) => `\t- ${language}: ${count}`).join('\r\n')}}
      Organization top repositories:\r\n{blue ${stargazersForOrganization.map(([repo, count]) => `\t- ${repo}: ${count} ⭐️`).join('\r\n')}}
      ${githubOrganization} members repositories: {blue ${repositories.length}}
      Top languages:\r\n{blue ${topPrimaryLanguages.map(([language, count]) => `\t- ${language}: ${count}`).join('\r\n')}}
      Top ${githubOrganization} members repositories:\r\n{blue ${stargazersForMembersOwnedRepositories.map(([repo, count]) => `\t- ${repo}: ${count} ⭐️`).join('\r\n')}}`)
  }

})()

