const fetch = require('node-fetch')
const { default: ApolloClient } = require('apollo-boost')

const githubId = process.env.GITHUB_ID
const githubToken = process.env.GITHUB_OAUTH

module.exports = new ApolloClient({
  uri: `https://api.github.com/graphql`,
  headers: {
    'User-Agent': githubId,
    Authorization: `token ${githubToken}`,
  },
  fetch,
})
