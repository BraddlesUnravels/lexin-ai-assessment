# Commit history provenance · reviewer documentation

- **Owner** Final review and documentation
- **Brief** User-requested clarification in the reviewer runbook
- **Outcome** Document the retained squash-marker commit and why its original history is preserved.

## Changes and decisions

| Stage | Original plan or expectation | Change, deviation, improvisation, or assumption | Reason and evidence | Impact and outcome | Developer decision, if required |
| --- | --- | --- | --- | --- | --- |
| Documentation | Reviewer guidance did not explain the all-caps squash-marker commit. | Added a concise note identifying `AGENT-SQUASH-THIS-COMMIT-AS-FIX` as an inadvertently retained squash marker and directing reviewers not to amend or rebase it out. | The Developer requested professional wording and chose to preserve the original commit and its metadata. | `.github/agents/assignments/material-register-reviewer-runbook.md` now explains the history artifact and preservation rationale. The branch was restored to the original tip. | No additional decision required. |

## Review and verification

- **Review outcomes** Documentation-only change; no independent review requested.
- **Checks** `git diff --check` passed. `HEAD` and `main` both resolve to `4e5ec9a0687c0f5fe07817c57bce9df600e3ab31`; `git show` confirms the original marker commit `ddfc6cba59a43466406846e5aa193c820f37f751`, its subject, and original author/committer timestamps. `git status --short` lists only the reviewer runbook and this completion record.
- **Open items** None. No remote push was performed; the Developer approved integrating this documentation commit into local `main`.
