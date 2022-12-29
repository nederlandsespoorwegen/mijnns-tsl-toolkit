# Workflows, CICD strategy
The following outlines this project's GitHub Actions workflows and the CICD strategy we want to follow.

## Feature branches and Pull Requests
`not-main-branch.yml`

These will run a workflow that builds and tests the code.

## Main branch
`main-branch.yml`

Every push to the main branch will tag the latest commit with the current version in `package.json`. If the version has not been bumped, and the tag already exists, it will not be overwritten. See: https://github.com/marketplace/actions/auto-tag

## Creating a release & NPM package
1. After the workflow on the main branch has finished and a tag has been created, a new release should be manually created based on that tag.
2. When this is done, another workflow, `on-release.yml`, will automatically run an NPM publish using the current version in `package.json`.