# Agent worktrees and local CI

Apply these instructions alongside the root [AGENTS.md](../../../AGENTS.md). Use the task brief for each agent’s file scope and acceptance criteria.

## Worktrees and branches

- Give each implementation agent its own worktree and integration branch, such as `agent/api`. If VS Code has already created the session worktree, use it; do not create a second one merely to satisfy this rule. The agent can try changes on branches created from its integration branch and bring accepted commits back to it.
- Run `task ci` on the final commit in the agent’s integration branch before handing completed work to a dependent agent or the integrator. Include any automated checks added by the task in the `ci` sequence in `Taskfile.yml`. If a check fails or cannot run, record the result and keep the handoff open.
- Hand off the exact commit SHA, any changed contract and the CI outcome. Run `task ci` again after combining dependent work. Keep the assessment branches local until the repository is ready to publish.

## Prepare the handoff branch

Use one local integration branch and worktree per assignment. Record any experimental branches or worktrees created for the assignment in your scratchpad. Before handoff:

1. Bring all experimental changes worth keeping onto the assignment's integration branch, including its tests and completion record. Discard abandoned experiments. Remove all experimental branches, worktrees and leftover files created for the assignment; force removal of those assignment-owned experimental resources is authorized where needed. Do not remove shared scratchpads, `main`, remote branches or resources belonging to another agent.
2. Agree the integration base with the Developer or integrator. Rebase the assignment branch onto that base when needed, resolving conflicts within ownership. Examine `git log <base>..HEAD` and the full diff. Squash fixups, corrections and other commits that add noise without useful history. Preserve distinct commits that explain meaningful stages or decisions. Use clear commit messages; there is no required number of commits.
3. Run the assignment's acceptance checks and `task ci` on the resulting branch head. Obtain independent review of the complete base-to-head diff and approval for that same head SHA. Record the base, final head, checks, approval and cleanup in the scratchpad.

Perform history cleanup before final CI and approval. An amend, rebase, new commit or other later change creates a new candidate: review the revised history as needed, rerun CI and obtain approval for the new head. If the integration base moves, coordinate the new base and repeat the required checks and review after rebasing. The Developer integrates approved work into `main`; agents do not merge it themselves. Do not rewrite another agent's branch or shared history.

## Final cleanup

Keep the handoff branch and worktree available until the Developer confirms integration. After confirmation, verify the approved changes are present on the destination branch, record the integrated SHA, then remove the assignment-owned handoff worktree, local branch and remaining temporary files. Force removal of those assignment-owned resources is authorized, including abandoned uncommitted or untracked work. Report cleanup failures. Do not remove shared scratchpads, the integrated work, `main`, remote branches, other agents’ resources or files outside the assignment's own temporary resources.

## Scratchpad collaboration

- Each agent keeps one Markdown scratchpad in a shared local directory. For sibling Git worktrees, use `agent-scratchpads/` inside the directory reported by `git rev-parse --path-format=absolute --git-common-dir`. Use the agent name for the filename, such as `api.md` or `ui.md`.
- Use scratchpads for all agent-to-agent questions, answers, and handoffs. Each agent edits only its own file and can read the other agents’ files. Direct messages and live agent conversations are out of scope.
- Write the question in your own scratchpad with a unique ID, the recipient, the decision you need, and the smallest useful file, line or commit reference. The recipient writes the answer in their own scratchpad under the same ID. Link back to the request so either agent can recover the thread.
- Check for entries addressed to you at task start, before relying on or changing a shared contract, and before handoff. If a reply is needed to finish a decision, record what is blocked and continue with independent work. Record the resolution in your scratchpad once you have it.

```text
api.md  [API-01] To UI: Should an omitted plant filter be absent from the URL? See ui/url-state.ts.
ui.md   [API-01] To API: Yes. Clearing the plant filter removes the key. See <commit>:<path>.
```

## TypeScript tooling

- Use the shared `.prettierrc`, framework-aware ESLint and strict TypeScript. Configure `@typescript-eslint/no-explicit-any` as an error.
- Keep individual commands in the package scripts and put their ordering in `Taskfile.yml`. The scaffold needs `format:check`, `lint`, `typecheck:api`, `typecheck:ui`, `build:api`, and `build:ui` scripts, plus `scripts/compose.sh`.

Go Task is required on developer hosts for `task ci`; reviewer application startup requires only Docker and Compose. Task 1 adds later tests to CI as they become runnable. The final integrated gate includes the full container and database exercise; record later-stage checks as not yet applicable, never passed.
