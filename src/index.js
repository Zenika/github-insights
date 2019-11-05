require('dotenv').config()
const ProgressBar = require('progress')

const {
  generateOrganizationData,
  MEMBERS_LOADED,
  START_ENHANCING_MEMBER,
  ENHANCING_MEMBER_DONE,
  ORGANIZATION_LOADED,
} = require('./core.js')

const {
  sleep,
  createDataFolder,
  writeMember,
  writeMembers,
  writeOrganization,
} = require('./utils')

require('yargs')
  .command(
    'generate',
    'Generate a data folder with all data related to the organization passed as parameter',
    {
      organization: {
        alias: 'o',
        default: process.env.GITHUB_ORGA,
      },
    },
    async function(argv) {
      const githubOrganization = argv.organization
      const githubId = process.env.GITHUB_ID
      const githubToken = process.env.GITHUB_OAUTH

      await createDataFolder()

      let bar
      const generator = generateOrganizationData(githubOrganization)

      for await (const event of generator) {
        switch (event.type) {
          case MEMBERS_LOADED:
            const members = event.value
            writeMembers(members)
            console.log(`Numbers of members: ${members.length}`)
            bar = new ProgressBar('downloading [:bar] :login (:percent)', {
              complete: '=',
              incomplete: ' ',
              width: 50,
              total: members.length,
            })
            break
          case START_ENHANCING_MEMBER:
            bar.tick({ login: event.value })
            break
          case ENHANCING_MEMBER_DONE:
            writeMember(event.value)
            break
          case ORGANIZATION_LOADED:
            writeOrganization(event.value)
            break
        }
      }
    },
  )
  .help().argv
