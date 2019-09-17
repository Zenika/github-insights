const fs = require('fs')
const path = require('path')

const rootDir = '../data'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function prettyJson(obj) {
  return JSON.stringify(obj, undefined, 2)
}

function createDataFolder() {
  if (!fs.existsSync(path.join(__dirname, rootDir))) {
    fs.mkdirSync(path.join(__dirname, rootDir), {},  (err) => {
      if (err) throw err;
    })
  }
}

function writeMember(member) {
  fs.writeFileSync(path.join(__dirname, rootDir, `${member.login}.json`), prettyJson(member))
}

function writeMembers(members) {
  fs.writeFileSync(path.join(__dirname, rootDir, 'members.json'), prettyJson(members))
}

function writeOrganization(organization) {
  fs.writeFileSync(path.join(__dirname, rootDir, 'organization.json'), prettyJson(organization))
}

module.exports = {
  sleep,
  writeMember,
  writeMembers,
  writeOrganization,
  createDataFolder,
}

