# Private error reporting

Bugsink is for failures, not user journeys. Umami remains the usage analytics
system. Do not infer mobile unique users or retention from error counts.

## Configuration and release

- Node: `BUGSINK_DSN`, optionally `BUGSINK_RELEASE` (image/release identifier).
- Browser: `NEXT_PUBLIC_BUGSINK_DSN`, `NEXT_PUBLIC_BUGSINK_RELEASE`, both required
  at **build time**. The Image workflow passes the public DSN GitHub repository
  variable and the source SHA to Docker. A runtime environment change cannot
  change an already-built browser bundle.
- Expo iOS/Android: `EXPO_PUBLIC_BUGSINK_DSN` at build/export time. Release comes
  from the Expo app version. A fresh mobile build/distribution is needed; this
  change does not publish an OTA update or upload an app to a store.
- An unset DSN disables the relevant reporter. Development/test reporting is
  disabled. Browser DNT/GPC signals also disable initialization.
- DSNs contain public ingest keys, **not** administrative credentials. Keep
  administrative tokens and source-map upload credentials out of app bundles.

Use separate Bugsink web/mobile projects for waslaeuft.in and Trackerr. The
hosting configuration and projects live in `server maintenance/ops/stacks/bugsink`.

## Privacy boundary

The shared `sanitizeErrorEvent` reconstructs an allowlisted event immediately
before transport. It removes all free-form messages, users, requests, URLs,
breadcrumbs, contexts, source context, frame locals, device information and
unrecognized fields. Only fixed error categories, individual event ID/time,
surface/release and code basenames/line positions remain. This intentionally
reduces grouping/debugging detail; it is not full-fidelity Sentry collection.
There are no replays, traces, profiles, session tracking, automatic logs,
network breadcrumbs, screenshots or native attachments. A network connection
still necessarily exposes a source IP to the hosting/proxy infrastructure;
do not describe this as no processing of personal data whatsoever.

Expo reports **JavaScript exceptions and React render errors only**. Native
SDK initialization/crash uploads are deliberately disabled because a JavaScript
`beforeSend` cannot sanitize a native crash uploaded before JavaScript starts.
No Sentry config plugin or upload build phases are added. JS diagnostics work
through the fetch transport, including Expo Go; native crash coverage is not
claimed. Source maps are not uploaded by this implementation.

## Controller checklist before rollout

- Complete/document a legitimate-interest assessment for the limited technical
  purpose (Art. 6(1)(f)); assess TDDDG separately. Technical choices alone do not
  certify compliance or establish an exemption from consent.
- Confirm the actual EU hosting location and current Hetzner Art. 28 DPA,
  processing inventory, access controls, deletion/objection process and any
  proxy/provider processing/transfers (including Cloudflare if enabled).
- Verify effective cleanup, not just `MAX_EVENT_AGE_DAYS`: delete reports after
  14 days with scheduled cleanup; don't retain event DB backups longer than the
  documented retention. See the hosting runbook for exact scheduling/exclusions.
- Review `/legal#fehlerdiagnose`, ensure the same policy is reachable in mobile
  settings, and update App Store privacy / Play Data safety declarations. Declare
  crash/diagnostic collection, not advertising tracking. This does not replace
  a review of existing Umami/location/push processing.
- Deploy the web code and distribute new mobile builds only after review.

## Validation

`bun test apps/nextjs/tests/helpers/errorReporting.test.ts` verifies the public wire
contract with nested sensitive values and source URLs. Also exercise the real
SDK transport with a synthetic failure, inspect the stored event and confirm
there are no messages, user IDs, request fields or breadcrumbs. Never put real
personal data into a diagnostic test report.
