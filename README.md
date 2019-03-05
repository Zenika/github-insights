# Why

This repository is a try to get insights on an GitHub organization and its members.

# Getting started

Install dependencies using `yarn`

```
yarn
```

# How to use in command line

Create an `.env` file

```
GITHUB_ID=<github_id>
GITHUB_OAUTH=<oauth to access the API>
GITHUB_ORGA=<organization_name>
```

If you do not know how to get the `GITHUB_OAUTH`, please see this [page](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line).
You have to create a token with the `read:org` access.

# Usage

The following command allows you to get information on your organization

```
yarn start
```

The following command allows you to get insights from the information

```
yarn stats
```
