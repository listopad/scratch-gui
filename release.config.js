module.exports = {
    extends: 'scratch-semantic-release-config',
    branches: [
        {
            name: 'develop'
            // default channel
        },
        {
            name: 'hotfix/REPLACE', // replace with actual hotfix branch name
            channel: 'hotfix',
            prerelease: 'hotfix'
        },
        {
            name: 'alpha',
            prerelease: true
        },
        {
            name: 'beta',
            prerelease: true
        }
    ]
};
