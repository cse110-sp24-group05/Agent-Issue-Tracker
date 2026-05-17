// commitlint.config.js
// enforces conventional commit format on every PR
// this is what lets semver.yml figure out version bumps automatically
//
// valid formats:
//   feat: add issue creation endpoint
//   fix: broken delete route
//   chore: update dependencies
//   docs: add jsdoc to worker functions
 
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // new feature → minor version bump
      'fix',      // bug fix → patch version bump
      'docs',     // documentation only
      'style',    // formatting, no logic change
      'refactor', // neither fix nor feature
      'perf',     // performance improvement
      'test',     // adding or updating tests
      'chore',    // build process, tooling
      'ci',       // CI/CD changes
      'build',    // build system changes
      'revert',   // reverting a commit
    ]],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
 