# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Instead, use
[GitHub's private vulnerability reporting](../../security/advisories/new) on this repository
(Security tab → "Report a vulnerability"), or email the maintainers if that isn't available to
you yet.

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof of concept.
- The version/commit you tested against.

We'll acknowledge reports as soon as we can and keep you updated as we work on a fix. Please
give us reasonable time to address the issue before any public disclosure.

## Scope

Arnia is self-hosted software: each instance is operated independently, and the operator is
responsible for their own deployment (see the disclaimer in `README.md`). This policy covers
vulnerabilities in Arnia's own code — authentication, authorization, injection, data exposure
between organizations/users within one instance, and similar issues — not the operator's server
hardening, DNS, or third-party services they've configured (e.g. their own Resend or SMTP
account).

## Supported versions

Arnia is pre-1.0 and under active development. Until a stable release line exists, only the
latest commit on `main` is supported — please make sure you can reproduce an issue there before
reporting it.

## Security-relevant design notes

For context when reviewing a report, see `CLAUDE.md` and `docs/PLAN.md` §5 ("Security") for how
authentication, permissions, encrypted secrets, and CSP are set up.
