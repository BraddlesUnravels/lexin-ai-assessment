---
name: design-tests
description: Design or implement tests for new or changed code, components, functions, API behaviour, database rules, and container startup. Use when asked to select cases, add or revise tests, or plan verification for a scoped change.
---

# Design tests

## Start from the behaviour

1. Read the task’s acceptance criteria, applicable `AGENTS.md`, repository testing standard, existing fixtures, and CI entry points. Trace the change through its normal entry point and identify the functions, components, and cross-layer contracts that own the changed behaviour.
2. Use the repository’s source and installed tool versions to choose the test approach. Consult relevant official docs or a documentation MCP and verify version-specific assumptions with a focused check where useful.
3. Return a case list and proposed test layer for a planning request. When test implementation is in scope, add the tests and run them. Use the repository’s existing helpers, fixture conventions, and runners.

## Specify the cases

- Select tests using impact, complexity, known weaknesses and existing coverage. There is no fixed quota per unit. Cover relevant invalid inputs, boundaries, failures and regressions where risk warrants it.
- Start each test description with lowercase `should ` and state the expected behaviour. Use the suite name for the subject. Apply the same description rule to database tests, reviewer scenarios, and named smoke assertions.
- Assert outputs, visible state, requests, or side effects that a caller can observe. Isolate dependencies in unit tests. Control the clock, seed data, and external responses where their variability matters.
- Cover the column and relationship rules in the testing standard against real migrated PostgreSQL. Exercise constraints with direct writes and query semantics through the real query functions. Isolate fixtures and compute expected values independently of the implementation under test.
- Keep reviewer scenarios focused on behaviour that depends on the assembled app. Use representative seeded inputs and verify the relevant public API or browser flow. Put cases in the repository’s existing locations, such as `tests/sanity-check/`, `tests/sanity-check/db/`, and `tests/reviewers/` in the Material Register.

Example for a pagination unit

- `should show three page choices with the middle page selected`
- `should disable navigation when there are no results`
- `should keep the final three page choices and hide the ellipsis on the last page`

## Exercise the app and report evidence

1. Run the affected unit suites first. For database changes, run the applicable real PostgreSQL suite. When startup, migrations, or container integration are involved, use the repository’s smoke script to start a disposable stack, verify readiness through the normal entry points, run the database suite against that stack, and exercise repeat startup when seeding or migration is involved. Capture failure logs and tear down the disposable stack.
2. Register new automated checks in the project’s local CI sequence. Run the full configured sequence, such as `task ci`, on the final candidate when completing a task. Record which commands actually ran, the outcome, and any check that could not run.
3. Record the affected units, selected cases, and check evidence for the worker or reviewer. For agent-to-agent handoffs, put the evidence in your own shared scratchpad under the task or review ID. Report a failed or unavailable required check as pending for handoff.
