(async function() {
  const config = require('dotenv').config()
  const { default: ApolloClient, gql } = require('apollo-boost')
  const httpie = require('httpie')
  const glob = require('glob')
  const fs = require('fs')
  const ProgressBar = require('progress')
  const path = require('path')

  const githubId = process.env.GITHUB_ID
  const githubToken = process.env.GITHUB_OAUTH

  const rootDir = 'data'
  const membersInError = []

  const client = new ApolloClient({
    uri: `https://api.github.com/graphql?access_token=${githubToken}`,
    fetch: async (uri, options) => {
      const { method } = options
      options.family = 4
      options.headers = {
        ...options.headers,
        'User-Agent': githubId
      }
      const res = await httpie.send(method, uri, options)
      return {
        text: async () => JSON.stringify(res.data),
        json: async () => res.data,
      }
    },
  })

  
  function getContributions(login) {
    return gql`
      {
        user(login: "${login}") { 
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
  }

  glob('./data/*.json', async function(err, files) {
    const bar = new ProgressBar('downloading [:bar] :login (:percent)', {
      complete: '=',
      incomplete: ' ',
      width: 50,
      total: files.length - 1
    })

    for(let file of files) {
      if (['members.json', 'organization.json', 'stats.json'].includes(file)) continue

      const member = JSON.parse(fs.readFileSync(file).toString('utf8'))
      bar.tick({ login: member.login })

      try {
        const response = await client
          .query({
            query: getContributions(member.login)
          })

        member.contributionsCollection = response.data.user.contributionsCollection

        fs.writeFileSync(path.join(__dirname, rootDir, `${member.login}.json`), JSON.stringify(
          member,
          undefined,
          2,
        ))
      } catch (err) {
        console.error('[ERROR]', err)
        membersInError.push(member.login)
      } 

      sleep(25)
    }

    console.log('membersInError', membersInError)
  })

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})()
