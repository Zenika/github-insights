const fetch = require('node-fetch')
const { default: ApolloClient, gql } = require('apollo-boost')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

Date.prototype.addHours = function(h) {
  this.setHours(this.getHours() + h)
  return this
}

const cache = {
  data: [],
  ttl: new Date(),
}

exports.hacktoberfest = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }

  const githubId = process.env.GITHUB_ID
  const githubToken = process.env.GITHUB_OAUTH

  const client = new ApolloClient({
    uri: `https://api.github.com/graphql?access_token=${githubToken}`,
    headers: {
      'User-Agent': githubId,
      Authorization: `token ${githubToken}`,
    },
    fetch,
  })

  if (cache.data.length > 0 && cache.ttl > new Date()) {
    return res.status(200).send(cache.data)
  }

  const handles = await fetch('https://oss.zenika.com/hacktoberfest.json').then(
    response => response.json(),
  )

  console.log(JSON.stringify(handles))

  const data = await Promise.all(
    Object.keys(handles).map(async handle => {
      await sleep(25)
      try {
        const response = await client.query({
          query: gql`
            query getUserPullRequest($login: String!) {
              user(login: $login) {
                login
                contributionsCollection(
                  from: "2022-10-01T00:00:00Z"
                  to: "2022-10-31T23:59:59Z"
                ) {
                  pullRequestContributions(first: 1) {
                    totalCount
                  }
                }
              }
            }
          `,
          variables: {
            login: handle,
          },
        })
        return response.data
      } catch (e) {
        console.log(JSON.stringify(e))
        return null
      }
    }),
  )

  console.log(JSON.stringify(data))

  const filteredData = data.filter(Boolean)

  filteredData.forEach(({ user }) => {
    user.location = handles[user.login]
  })

  cache.data = filteredData
  cache.ttl = new Date().addHours(1)

  res.status(200).send(filteredData)
}
