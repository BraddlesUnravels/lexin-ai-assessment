# AGENTS.md

This is the Material Register for Lexin’s Pragmatist assessment. Use the assessment brief for requirements and your task brief for scope and acceptance criteria.

## Agent assignments

Start with the [assignment index](.github/agents/assignments/README.md), its shared ownership matrix, and the brief assigned to you. Read other briefs for dependencies and context. Follow the [developer escalation rules](.github/agents/standards/agent-escalation-rules.md) before making a cross-system plan change or continuing past a blocker.

## Application plans

Start with the [Material Register implementation plan](.github/agents/project/material-register-implementation-plan.md) for task dependencies, demo fixtures, and links to the application architecture, schema, queries, API, seed, and UI plans. These plans live in `.github/agents/project/`.

## Project standards

Read the standards relevant to your task and apply them from their linked files.

| Resource                                                                                 | When to use it                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Worktrees, scratchpads, and local CI](.github/agents/standards/agent-worktree-rules.md) | At task start and whenever coordinating with another agent or handing off work.                                                       |
| [Agent iteration and review](.github/agents/standards/agent-iteration-and-review.md)     | When implementing a change, reviewing a candidate, or resolving findings. Covers readability, modularity, and the definition of done. |
| [Register testing standard](.github/agents/standards/register-testing-standard.md)       | When designing, implementing, or reviewing Vitest, PostgreSQL, reviewer, or container smoke checks.                                   |
| [UI conditional rendering rules](.github/agents/standards/ui-conditional-rendering-rules.md) | When writing React JSX conditions, choosing fallback operators, or simplifying display logic. |
| [Taskfile.yml](Taskfile.yml)                                                             | For the ordered local CI checks. Run `task ci` for completed handoff; Go Task is a developer prerequisite.                                                                 |
| [Prettier configuration](.prettierrc)                                                    | For the shared formatting rules.                                                                                                      |

## Project skills

- [`design-tests`](.github/agents/skills/design-tests/SKILL.md) for workers planning or implementing tests for changed behaviour.
- [`code-review`](.github/agents/skills/code-review/SKILL.md) for the independent reviewer on each candidate and re-review.

Use the linked `SKILL.md` as the workflow entry point in each agent’s worktree.

## Completion records

Start a [completion record](.github/agents/completed/README.md) for your assignment. Record changes, deviations, improvisations, and assumptions as they occur in planning, development, and review. Include the record in the final candidate and link it in the scratchpad handoff.

## Completed handoff

Use the shared scratchpads for agent-to-agent questions, review findings, and handoffs. A completed handoff requires experimental branch cleanup, selective squashing of noisy commits on the agreed integration base, the task’s acceptance checks, independent reviewer approval, and a passing `task ci` on that same final head SHA. Record the SHA, check results, and any contract changes in your scratchpad. The human integrates approved work into `main`.
