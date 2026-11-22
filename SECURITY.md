# Security controls and tests

This is a small booking application, not an independently certified security product. Passing tests and a clean dependency scan do not prove the absence of vulnerabilities.

## Authentication and recovery

- `admin` is a convenience alias for the configured existing admin account. It is not a secret, a second factor, or a separate account.
- Passwords are checked with bcrypt. Existing passwords are not changed by this hardening work.
- Login attempts for an existing account share an atomic MongoDB budget of 10 attempts per minute, including requests handled by different serverless instances. The window expires automatically. This can still be abused for short-term denial of login, and it does not stop someone who knows the correct password.
- New admin JWTs expire after 30 minutes. Customer JWT lifetime continues to use the existing configuration. Older tokens keep their original expiry until revoked.
- Logout revokes all current sessions for that account. Password changes and password resets revoke earlier tokens through an account token version.
- Existing unversioned tokens are treated as version 0 for compatibility. Logout or a password change/reset invalidates them too.
- Email verification and password recovery are email-only. A caller-selected phone cannot receive a code for an email account. Old SMS-issued codes are not accepted.
- OTP attempt reservation, OTP consumption and email issue budgets use atomic database operations. Codes are hashed, expire, and can only be consumed once. Delivery failures count against the request budget to prevent provider abuse.
- Profile settings cannot change the recovery email until a separately verified email-change flow is implemented. Name and phone editing remain available. A profile phone is not evidence of phone ownership.
- Startup seeding preserves an existing admin account. It no longer resets its password, changes its role/verification state, or deletes a stale admin account. Seed credentials are only for initial creation.

## Authorization and input handling

Admin routes require both authentication and the current database admin role. Customer vehicles, bookings and notifications are filtered by their owner on the server. Booking prices come from the server catalogue, not a client total. Validation rejects extra fields, empty service selections, duplicate add-ons, malformed identifiers, invalid dates/times and invalid coordinates.

Helmet headers, strict DTO validation, a CORS origin allowlist and the existing general request throttle remain in place. CORS is a browser policy, not authentication. The general IP throttle remains process-local; the login and OTP account budgets described above are database-backed.

## Running the checks

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:coverage
npm audit --omit=dev
```

The test suites use a temporary local MongoDB. Outbound email/SMS are stubbed for tests. They must never be pointed at a production database. The e2e runner enables Node VM modules for the current MongoDB driver's runtime adapters under Jest.

`test:coverage` runs unit, middleware and HTTP/database integration suites together and measures every TypeScript file under `src`, including untested files. Gates are 75% statements, 65% branches, 75% functions and 75% lines. The source-wide figure includes DTO/schema/module declarations; it is not an assurance score. Reports are written to ignored `coverage/` files.

The GitHub workflow runs these checks on the public repository using standard Ubuntu runners, read-only repository permissions and pinned action commits. It does not access production credentials or send real messages.

## Remaining limits

- No MFA, mandatory per-login code, or trusted-device enrollment is enabled by these changes. Those require an explicit product/recovery decision. A remembered browser token alone cannot prove a physical device is trusted.
- Browser bearer tokens are still stored in localStorage. A successful same-origin XSS can steal them. Migrating to HttpOnly sessions needs a coordinated frontend/backend and CSRF design.
- These tests are not a full browser automation suite, load test, independent penetration test, or proof that every race/business rule is covered. Overlapping new bookings are reserved with a unique MongoDB minute-occupancy index across instances. Adjacent bookings remain allowed. Cancellation releases the keys; restoring a cancelled booking rechecks conflicts. Legacy bookings are respected without rewriting them. Index initialization must succeed before booking saves are accepted. This preserves the existing one-team scheduling policy, not a new multi-team scheduler.
- Network allowlists, hosting/account security, mailbox security, secret history/rotation and operational monitoring need separate checks. Do not tighten a serverless database allowlist without first proving the deployment can still connect.
- A production dependency audit is narrower than a whole-development-toolchain audit. Current remaining advisories are in the Nest CLI and Vercel builder development trees. CLI glob/minimatch concerns are filesystem-pattern denial of service during tooling use. The Vercel builder carries older routing, HTTP-client/multipart and configuration-validation packages. Application Nest/Express routing uses a separate patched path-to-regexp version; application sources do not import those older tool copies. That does not prove the hosted platform omits every affected helper from its generated runtime. Builder/dev-server risk and platform packaging need separate review. Do not force breaking CLI upgrades or builder downgrades just to produce a zero count.
