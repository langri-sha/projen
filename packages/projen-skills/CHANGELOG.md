# Change Log - projen-skills

<!-- This log was last generated on Thu, 29 Oct 2026 17:17:09 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.3.0

Thu, 29 Oct 2026 17:17:09 GMT

### Minor changes

- Accept a release tag such as v1.2.3 as the ref of a git skill source (filip.dupanovic@gmail.com)

### Patches

- Pass --no-frozen-lockfile when synthesis syncs, so CLI releases that freeze the lock in CI still regenerate it (filip.dupanovic@gmail.com)

## 0.2.0

Tue, 27 Oct 2026 18:24:05 GMT

### Minor changes

- Commit the installed skills with the ignore option (filip.dupanovic@gmail.com)

## 0.1.3

Tue, 13 Oct 2026 20:46:26 GMT

### Patches

- Update dependency @types/node to v24.19.2

## 0.1.2

Sun, 11 Oct 2026 02:44:24 GMT

### Patches

- Let the projen peer range reach 1.0.0 (filip.dupanovic@gmail.com)
- Widen the projen peer range to >=0.86.0 \<0.101.7 (filip.dupanovic@gmail.com)

## 0.1.1

Sat, 10 Oct 2026 05:05:17 GMT

### Patches

- Publish as `projen-skills`, without the `@langri-sha` scope (filip.dupanovic@gmail.com)

## 0.1.0

Sat, 10 Oct 2026 04:22:37 GMT

### Minor changes

- Declare agent skills in package.json and install them with the skills CLI (filip.dupanovic@gmail.com)
