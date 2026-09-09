# Publishing

NevaUI is published to npm as `nevaui`. This is what the repository does automatically and
what a person has to do once, by hand.

## What the repository does

Pushing a tag that starts with `v` runs [`.github/workflows/release.yml`](../.github/workflows/release.yml),
which verifies, builds and publishes.

The shape of that workflow is the security decision, and it is worth understanding rather
than copying:

- **Two jobs.** The tests run with no credentials at all. The job that can publish never
  executes the test suite, so the three hundred packages of tooling are never in the room
  with the ability to publish.
- **`--ignore-scripts` in the publishing job.** Every recent npm compromise ran its
  payload from a lifecycle script. Nothing in this tree needs one, so nothing is permitted
  to run one there.
- **No npm token anywhere.** Publishing uses OIDC — GitHub proves its identity to npm at
  the moment of publishing, and npm grants permission for that one request. There is no
  long-lived secret in the repository to leak, which is a different thing from a secret
  that is well guarded.
- **Actions pinned to commits, not tags.** A tag can be moved by whoever controls the
  repository it points at.
- **The tag has to match the version** in `package.json`, or the job stops.
- **`--provenance`** attaches a signed statement tying the tarball to this commit and this
  workflow. Anyone can check that what is on npm came from what is on GitHub.

## What you have to do once

The repository cannot do these. They need an npm account, and that is deliberate.

1. **Create the package.** The first publish claims the name, and until it exists there is
   nothing to configure. Either run `npm publish --provenance --access public` once from
   your own machine after `npm login`, or create a placeholder and let the workflow take
   over.
2. **Turn on two-factor authentication** on the npm account, and set the package to
   require it for publishing.
3. **Add the trusted publisher.** On npmjs.com, under the package's settings, add a GitHub
   Actions trusted publisher: this repository, workflow `release.yml`, environment `npm`.
   Until that exists the workflow's OIDC token means nothing to npm and publishing fails —
   which is the correct failure.
4. **Create the `npm` environment** in the repository settings, and add yourself as a
   required reviewer if you want a human approval between the tag and the publish.

## Cutting a release

```bash
# on main, with a clean tree
pnpm validate
npm version minor          # 0.1.0 → 0.2.0, and writes the tag
git push --follow-tags
```

Versions are `0.x` and will stay there while components are ⚡ Experimental. In `0.x` a
minor bump is allowed to break things, which is exactly what every component's
documentation already promises.

## What is published

`dist` only — the bundle, its types, the stylesheet and its declaration — plus the readme
and the licence. No source, no tests, no configuration.

**The package has no runtime dependencies at all.** Installing it adds no third-party code
to anyone's tree, which is the single strongest thing that can be said about a package's
supply chain. The peer dependency on React is not installed by it; it uses the React that
is already there.

Verified before each release by the checks in `pnpm validate`, and worth re-running by
hand if the dependency tree has changed:

```bash
pnpm pack                        # inspect exactly what would go up
pnpm audit                       # known vulnerabilities
grep -rE "fetch|eval|innerHTML" src/   # the library makes no network calls and evaluates nothing
```
