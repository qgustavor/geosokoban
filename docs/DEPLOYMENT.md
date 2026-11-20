# Checks and deployment

This prototype uses one workflow, `.github/workflows/pages.yml`, named **CI and
Pages**. Keep validation and publication as separate jobs in the same run. There
is no second workflow watching for a successful run, and no build on a deployment
branch. The `deploy` job depends on `validate` and publishes its tested artifact
without checking out or rebuilding the application.

## What runs when

| Event | Validate | Publish to Pages |
| --- | --- | --- |
| Push to the repository's default branch | Yes | Only after validation succeeds |
| Push to another branch | Yes | No |
| Pull request, including a fork | Yes | No |
| Manual run on the default branch | Yes | Only after validation succeeds |
| Manual run on another branch or a tag | Yes | No |
| Tag push | No | No |

The default branch comes from GitHub's repository metadata; it is not hard-coded
to `main` or `master`. Opening a PR from a branch in this repository can produce
both a branch-push check and a PR check. That small duplication is intentional:
branch work gets feedback before a PR exists, and the PR checks its merge result.

The default-branch pipeline is serialized and an active run is not canceled by
a new push or manual run. GitHub can replace an older pending run with a newer
one. Other branches and PRs cancel their own obsolete runs without interrupting
publication. This is not a release history: use Git tags for milestones, and use
a reviewed revert on the default branch to roll back a change through the same
checks rather than deliberately rerunning an old deployment.

## The validation gate

`Validate` uses the Node version in `.nvmrc` (currently 24) on Ubuntu 24.04. It
installs from the committed lockfile with `npm ci`, runs the Node behavior tests
and ESLint, checks the prepared scenery atlas, builds with Vite, and runs all five
Playwright journeys in both the desktop and mobile projects against the build.
The build's existing `prebuild` also validates map outlines and biomes and copies
third-party licenses.

Only Chromium is installed: the mobile project is Chromium with touch and mobile
viewport emulation, not a real iPhone or Safari test. CI uses one Playwright worker
to avoid competing game-generation workers, rejects accidentally committed
`test.only`, and keeps the existing single retry. No new gameplay tests, source
or compiled-code inspections, screenshot assertions, coverage thresholds, timing
thresholds, large seed sweeps, or content regeneration are added to this gate.

The supplied scenery atlas is already prepared. The earlier README warning was
stale. Publication continues to require that prepared data; it does not download
or regenerate the upstream geographic dataset during CI. Prepare content and run
benchmarks explicitly when working on those features, then commit reviewed data.

For publication, `configure-pages` supplies the actual site base path, including
an empty prefix for root/custom-domain sites. For non-publishing runs, the build
uses `/ci-preview/` to exercise subdirectory hosting without accessing Pages.
The same `BASE_PATH` is passed to Vite and Playwright's production preview.

The Pages artifact is uploaded only after all checks succeed. Its name includes
the producing run attempt and is passed as a job output, so rerunning a failed
deploy job refers to the already validated artifact rather than guessing the
current attempt's name. Artifacts are retained for seven days. Once an artifact
has expired, start a new run on the default branch to validate and build again.

## One-time repository setup

1. In **Settings → Pages → Build and deployment**, set **Source** to
   **GitHub Actions**. Do not add a second generated publishing workflow.
2. In **Settings → Environments → github-pages**, restrict deployment branches
   to your actual default branch. For fully automatic deployment, do not add a
   required reviewer or wait timer to this environment. Keep branch restrictions.
3. For a PR-based development process, add **Validate** as a required status
   check in the default branch's ruleset/protection after it has run once. Do not
   require **Deploy Pages**, which is intentionally skipped on pull requests.

The workflow uses the automatically provided `GITHUB_TOKEN` and Pages OIDC
identity. It does not require a personal access token, a deployment secret,
repository-wide write permissions, or a `gh-pages` branch. Validation has only
`contents: read` and `pages: read`; only the deployment job has `pages: write` and
`id-token: write`. That privileged job never executes application code.

Pull requests use `pull_request`, not `pull_request_target`. First-time external
contributors may still need the normal GitHub Actions approval before their
checks run. Do not loosen that repository policy to make deployment work.

These settings live in GitHub and are not changed by applying the patch. The
workflow targets GitHub.com with GitHub-hosted Ubuntu runners, not an unverified
GitHub Enterprise Server or self-hosted runner configuration.

## Failures and maintenance

A failed install, test, lint, content check, build, or browser journey stops
publication. The current live site remains unchanged. There is no fallback from
`npm ci` to `npm install` and no `continue-on-error` for a failed gate. A missing
or inconsistent lockfile must be fixed and committed, not repaired during deploy.

Browser runs write GitHub annotations and an HTML report. The workflow uploads
`playwright-report/` and `test-results/` when present, including traces for failed
journeys, and retains them for seven days. Download the report from the workflow
run's **Artifacts** section to inspect a browser failure. No screenshots or trace
files are compared to snapshots or committed to the test suite.

Direct action dependencies are pinned to full commit SHAs with release-version
comments. `.github/dependabot.yml` checks only the GitHub Actions ecosystem each
week, groups updates, and allows one open version-update PR. Updates are not
auto-merged. Application dependency versions and the lockfile are unchanged.

There is deliberately no OS/Node/browser matrix, scheduled benchmark gate,
automatic puzzle regeneration, per-PR deployment system, or release-approval
ceremony for this prototype. Add a separate workflow only when a task has a
genuinely different trigger, permissions, or lifecycle. Automated browser checks
do not replace manual playtesting of touch controls, artwork, audio, or difficulty.

For local commands and the limits of the verification performed while preparing
these patches, see [Testing](TESTING.md). A local syntax/YAML check is not proof
that a GitHub-hosted deployment has succeeded; inspect the first Actions run.
