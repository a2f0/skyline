# Deploying

The site is live at [skyline.devopsrockstars.com](https://skyline.devopsrockstars.com), served by
the `devopsrockstars-skyline-prod` Cloudflare Worker as static assets. There is no server-side
code: the Worker has no `main`, so Cloudflare answers every request from the uploaded files. This
matches how the rest of the `devopsrockstars.com` zone is served — each host is a Worker with a
custom domain, not a Pages project or an S3 bucket. Deploys are manual.

## Publishing content

Deploying needs Bun and Node.js 22+, because Wrangler runs under Node: its deployment step stops
silently after the asset upload under Bun's runtime. Content deploys authenticate with Wrangler's
own stored credentials (`wrangler login`); no repository file is read.

```sh
bun install --ignore-scripts
bun run deploy
```

`bun run deploy` compiles the browser modules into `dist/` via `scripts/build-site.ts` and then
runs `wrangler deploy`. There is still no bundler and no transformation beyond tsc's per-file emit.

The staged set is an allowlist, not an ignore list: the repository holds `.secrets/`, test
fixtures, and, in `src/` beside the pages, the 18MB `src/skyline.jpg` source photograph that the
site never requests, so only files named in `scripts/build-site.ts` reach Cloudflare. Each keeps
its path within `src/`, so `src/index.html` is served at `/index.html`. Every top-level
`src/models/*.ts` ships automatically as compiled `.js` and its `.svg` excerpt ships as-is; nested
directories and other file types do not. New top-level runtime files in `src/` must be added to the
list, and the script fails rather than publishing if a listed file has been renamed away.

## Verification

`bun run deploy` then runs `scripts/verify-deploy.ts` against the live site, and
`bun run verify:deploy` runs it on its own (`--url` points it elsewhere; `SKYLINE_SKIP_VERIFY=1`,
and only `1`, skips it). A deploy skips verification when it published nothing (`--dry-run`) or
aimed somewhere else (`--env`, `-e`, `--name`), and says which, because checking production after
publishing to another Worker would report the previous deploy as though it were this one.
`--outdir` and `--outfile` still publish, so they are still verified.

It asserts two things:

- Every file the allowlist publishes is served **byte for byte** against a fresh local build. A
  deploy is a copy of a build, so anything else is a bad deploy, and comparing hashes catches a
  file served empty or stale, which a status code does not.
- Nothing else in the repository is reachable at all. That set is derived from `git ls-files` and
  a walk of `.secrets/`, minus what `scripts/build-site.ts` publishes, because a hand-kept list of
  forbidden paths is a sample and a sample cannot prove absence.

Published requests follow redirects, because Cloudflare answers an `.html` request with a 307 to
the extensionless path, and they are retried, because the edge can 404 an asset for seconds after
wrangler has reported the upload a success. Requests for paths that must not exist do neither: a
redirect is not proof of absence, and a request that never resolves is a failure rather than a
quiet pass. Every request carries a timeout and the run carries a deadline, so a hung edge ends the
deploy in minutes instead of hours. `tests/verify-deploy.test.ts` covers those failure paths, since
a checker that cannot fail is worse than none.

One thing would make it fail on a good deploy: a Cloudflare feature that rewrites responses, such
as Rocket Loader or Email Obfuscation, changes the bytes the edge returns and every HTML file would
then differ from the fresh local build. Compression does not — undici decodes gzip and brotli
before the comparison.

## The custom domain

`terraform/` owns one resource, the `cloudflare_workers_custom_domain` binding
`skyline.devopsrockstars.com` to the Worker, with state in the shared `tearleads-terraform-state`
bucket. It rarely changes and is not part of a content deploy:

```sh
scripts/terraform.sh plan
scripts/terraform.sh apply
```

`scripts/terraform.sh` reads the gitignored `.secrets/root.env`, which needs
`TF_VAR_cloudflare_api_token` and `TF_VAR_cloudflare_account_id` (the token needs Workers
Scripts:Edit and Zone:Read on the zone), plus `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for
the S3 Terraform backend. `scripts/secrets.sh` loads that file, fails loudly on a missing variable,
and re-exports the Cloudflare pair under the `CLOUDFLARE_*` names Terraform expects. `.secrets/` is
gitignored and never committed.

Order matters on a first apply, and only there: wrangler must publish the Worker before Terraform
can point a hostname at it. Cloudflare serves `.html` requests with a 307 to the extensionless
path, so `building-study.html` lands on `/building-study` with identical content; `wrangler.jsonc`
explains why the alternative costs more than the redirect.
