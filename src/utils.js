const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const existsAsync = promisify(fs.exists)
const mkdirAsync = promisify(fs.mkdir)

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

function writeMember(member) {
  fs.writeFileSync(path.join(__dirname, rootDir, `${member.login}.json`), prettyJson(member))
  return member
}

function writeMembers(members) {
  fs.writeFileSync(path.join(__dirname, rootDir, 'members.json'), prettyJson(members))
  return members
}

function writeOrganization(organization) {
  fs.writeFileSync(path.join(__dirname, rootDir, 'organization.json'), prettyJson(organization))
  return organization
}

module.exports = {
  sleep,
  writeMember,
  writeMembers,
  writeOrganization,
  createDataFolder,
}

