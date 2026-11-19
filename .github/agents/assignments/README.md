# Agent assignments

Select the matching `.agent.md` profile from `.github/agents/` in VS Code, then open the brief for the assignment the Developer gave you. Use the separate Independent code reviewer profile for candidate reviews. All briefs are available for reading when you need upstream or downstream context. Keep edits within your assigned ownership and coordinate through the shared scratchpads.

Read the [developer escalation and approval rules](../standards/agent-escalation-rules.md) and the [application implementation plan](../project/material-register-implementation-plan.md) before starting.

| Assignment                                 | Brief                                                                                                                                                       | Handoff or dependency                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Task 1 · Scaffold and startup              | [Scaffold agent brief](material-register-scaffold-agent-brief.md)                                                                                           | Supplies the startup, toolchain and proxy contracts to Tasks 2–4.                           |
| Task 2 · Schema and seed                   | [Schema and seed agent brief](material-register-schema-and-seed-agent-brief.md) and [startup handoff](material-register-schema-and-seed-startup-handoff.md) | Uses Task 1’s startup contract, performs at most 10 minutes of catalogue research, and supplies the database, shared types and fixture results. |
| Task 3 · Queries and API                   | [Query and API agent brief](material-register-query-and-api-agent-brief.md)                                                                                 | Uses the scaffold and seeded database. Supplies the typed API contract to Task 4.           |
| Task 4 · Register UI                       | [UI agent brief](material-register-ui-agent-brief.md)                                                                                                       | Uses the scaffold, typed API contract and observed fixture results.                         |
| Task 5 · Reviewer and documentation        | [Reviewer runbook](material-register-reviewer-runbook.md)                                                                                                   | Uses the observed checks and results from the implementation assignments.                   |

See [AGENTS.md](../../../AGENTS.md) for the shared standards, review skills, and completion gate.

## Shared ownership and coordination

| Resource | Owner |
| --- | --- |
| Root package and lockfile, TypeScript, ESLint, Prettier and Vitest configuration, shared test helpers, `Taskfile.yml`, Docker/Compose files, `scripts/compose.sh` and `scripts/container-smoke.sh` | Task 1. Later owners request shared changes in scratchpads; Task 1 applies them unless the Developer reassigns ownership. |
| `tests/sanity-check/db/` | Task 2 owns schema/seed test files; Task 3 owns separate query test files. Coordinate filenames. |
| Remaining `tests/sanity-check/` | Task 3 owns API tests and Task 4 owns UI/URL tests, in separate files. Task 1 owns shared setup. |
| `tests/reviewers/` and final integrated exercise | Task 5 owns reviewer-specific cases and execution. Task 1 owns changes to shared harness and configuration. |
| Catalogue templates and source notes | Task 2. No separate sourcing agent, CSV or handoff. |
| `README.md` | Task 5; other agents contribute facts through scratchpads. |
| Root guidance and standards | Task 5 coordinates corrections with the Developer; each assignment owner owns its own completion record. |

Downstream agents may prepare independent work against documented interfaces. Completed dependency handoffs still require independent approval and passing current CI on the final branch head after selective history cleanup. The Developer integrates approved work into `main`.

## Dependency-aware scheduling

The Developer starts separate worktree sessions only where useful and selects their bases. Do not assume every assignment can run independently. Each review uses an agent other than the worker and approves the exact candidate SHA. The Developer integrates reviewed changes into `main`.

| Stage | Start or overlap | Integration gate |
| --- | --- | --- |
| Bootstrap | Task 1 implements the scaffold and shared tooling. | Task 1 accepted, independent review and current CI pass on its final head, then Developer integrates. |
| Schema | Task 2 starts from integrated Task 1. Tasks 3 and 4 may concurrently read plans and prepare notes or isolated work that does not assume unfinished interfaces; no production code against guessed contracts. | Task 2 hands off schema names, fixtures, seed and shared constants; reviewer approves and Developer integrates. |
| API | Task 3 starts implementation on integrated Task 2; Task 4 may prepare UI-only work against documented interfaces, without editing shared files or claiming integration complete. | Task 3 passes review and current CI, then Developer integrates. |
| UI | Task 4 bases or rebases its final candidate on integrated API and runs real seeded browser checks. | Task 4 passes review and current CI, then Developer integrates. |
| Final | Task 5 checks the integrated app, container suites and README. | Reviewer records actual final results and unresolved issues; Developer reviews and integrates documentation. |

Task 1 remains available for later shared tooling changes. Avoid parallel Compose port and project-name collisions. A dependent worker must not claim completion against a guessed interface or unintegrated candidate; if its base changes, coordinate the rebase and rerun checks and review. The complete workflow and startup prompts are in [VS Code workflow](../VS-CODE-WORKFLOW.md).
