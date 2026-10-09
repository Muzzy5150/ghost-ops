# CI and repository release

GitHub's default branch and Vercel's Production branch are `main`. The private repository is connected through the existing Vercel GitHub installation. Branch pushes create previews; a reviewed `main` revision builds Production. No duplicate project or deployment token is introduced.

`.github/workflows/ci.yml` uses pinned actions, read-only contents permission, and checkout without persisted credentials. Platform checks cover typecheck, lint, tests, build, SDK packaging, independent MCP/runtime checks, and production dependency audit. The separate website job covers its static build, typecheck, lint, boundary/data tests, Chromium regressions, and dependency audit. Paid inference and external sponsor transfers remain disabled in CI.

The cleaned `main` starts with one genuine root snapshot commit. Its timestamp is the actual commit time; GitHub will naturally age that timestamp. Every included file derives from that root commit. Complete prior refs and development history are retained in a verified private offline bundle. Local development worktrees and the protected release tag are preserved.

Prepare and verify an exact candidate Preview before replacing a branch. Use an explicit expected remote revision with force-with-lease for an authorized rewrite; stop if protection or an unexpected remote update blocks it. Do not publish backups, databases, keys, sessions, or private forensic payloads. A successful build is not a claim of live backend security readiness.
