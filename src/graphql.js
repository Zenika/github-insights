const httpie = require('httpie')
const { default: ApolloClient } = require('apollo-boost')

const githubId = process.env.GITHUB_ID
const githubToken = process.env.GITHUB_OAUTH

module.exports = new ApolloClient({
  uri: `https://api.github.com/graphql?access_token=${githubToken}`,
  fetch: async (uri, options) => {
    const { method } = options
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

