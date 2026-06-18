# Publishing Guide

## Prerequisites

1. Create an npm account: https://www.npmjs.com/signup
2. Verify your email
3. Set up 2FA (recommended)

## Publishing Steps

### 1. Login to npm

```bash
npm login
```

Enter your npm username, password, and email.

### 2. Verify package contents

```bash
cd /packages/cli
npm pack --dry-run
```

This shows what will be published.

### 3. Publish to npm

For scoped package (`@future/cli`), you have two options:

#### Option A: Public package (recommended for open source)

```bash
npm publish --access public
```

#### Option B: Private package (requires npm paid plan)

```bash
npm publish
```

### 4. Verify publication

```bash
npm info @future/cli
```

Users can now install with:

```bash
npm install -g @future/cli
```

## Updating the Package

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build: `npm run build`
4. Publish: `npm publish`

### Version Bumping

```bash
# Patch release (1.0.0 -> 1.0.1) - bug fixes
npm version patch

# Minor release (1.0.0 -> 1.1.0) - new features
npm version minor

# Major release (1.0.0 -> 2.0.0) - breaking changes
npm version major
```

## Beta/RC Releases

```bash
# Publish beta
npm version 1.1.0-beta.1
npm publish --tag beta

# Users install with:
npm install -g @future/cli@beta
```

## Deprecation

To deprecate a version:

```bash
npm deprecate @future/cli@1.0.0 "Critical security issue, upgrade to 1.0.1"
```

## Unpublishing

Only possible within 72 hours of publishing:

```bash
npm unpublish @future/cli@1.0.0
```

## CI/CD Publishing

For automated publishing, use npm tokens:

1. Create token: `npm token create --type=granular`
2. Add `NPM_TOKEN` to GitHub secrets
3. Create `.github/workflows/publish.yml`:

```yaml
name: Publish
on:
  release:
    types: [created]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Notes

- The `prepublishOnly` script runs automatically before publishing
- `.npmignore` excludes development files
- `files` in package.json explicitly includes only `dist` and `README.md`
- Package size: ~6.3 KB (compressed)
