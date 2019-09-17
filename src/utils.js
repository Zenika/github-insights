const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const existsAsync = promisify(fs.exists)
const mkdirAsync = promisify(fs.mkdir)
const writeFileAsync = promisify(fs.writeFile)

const rootDir = '../data'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function prettyJson(obj) {
  return JSON.stringify(obj, undefined, 2)
}

async function createDataFolder() {
  const folderPath = path.join(__dirname, rootDir)
  const alreadyExists = await existsAsync(folderPath)
  if (!alreadyExists) return mkdirAsync(folderPath)
}

async function writeMember(member) {
  await writeFileAsync(path.join(__dirname, rootDir, `${member.login}.json`), prettyJson(member))
  return member
}

async function writeMembers(members) {
  await writeFileAsync(path.join(__dirname, rootDir, 'members.json'), prettyJson(members))
  return members
}

async function writeOrganization(organization) {
  await writeFileAsync(path.join(__dirname, rootDir, 'organization.json'), prettyJson(organization))
  return organization
}

module.exports = {
  sleep,
  writeMember,
  writeMembers,
  writeOrganization,
  createDataFolder,
}

