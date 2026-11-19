# Agent iteration and review standards

Apply these instructions alongside the root [AGENTS.md](../../../AGENTS.md) and the worktree and scratchpad rules. The task brief supplies the scope, acceptance criteria, and any task-specific checks.

## 1. Implement a reviewable change

- Read the task brief, relevant code, existing tests, and any scratchpad decisions that affect the task. Identify the expected behaviour and the entry point through which a user or caller reaches it.
- Check applicable best practices before choosing an approach or making a material change to it. Inspect the repository’s patterns, installed dependency versions, and configuration. Use the relevant available tools, including documentation MCPs, official documentation, source search, and local verification. Verify version-sensitive behaviour against the version in the repository. Record the source or local evidence for decisions that affect the design or contract.
- Implement the approach you judge best within the task scope. Run focused checks while iterating. Bring the candidate onto the agent’s own integration branch; before final review clean up experimental branches, rebase onto the agreed base as needed, and selectively squash history under the worktree rules. Record the outcome of any checks already run.
- Post the review request in your own scratchpad with a review ID, reviewer, base SHA, candidate SHA, acceptance criteria, and evidence. A review request is an intermediate handoff. Apply the worktree rules’ full CI handoff gate when sending completed work for integration or dependency use. That gate requires the full CI result and review approval for the final commit.

## 2. Use human readability as an acceptance criterion

- Make the entry point show the flow in the order it runs. Keep orchestration visible and give distinct responsibilities clear names. A reader should be able to follow the main path and recognise the decisions, side effects, and error paths on a first pass.
- Compose appropriately sized functions, hooks, and components. Move substantial logic into a nearby, clearly named module when it has its own responsibility, such as a request handler, query builder, state hook, or presentation component. Keep straightforward code where it is used when extraction would add an extra jump without clarifying the job.
- Prefer intention-revealing names, flat control flow, and existing types and helpers. Keep the behaviour visible where decisions are made. Use explicit boundary types and validation where the contract needs them. Apply the existing TypeScript and formatting rules.
- Simplify difficult code first. If the complexity is required, add a short comment near the logic to explain the reason, invariant, edge case, or framework constraint. Document a public contract or architectural decision where its callers or maintainers will look for it.

Two examples from existing repositories illustrate the expected composition. In Access Control Demo, `StudentConsultationsView` lays out the dashboard using focused components, with consultation state and actions handled by nearby hooks. In Qwik, `ProjectPage` makes the page structure visible by composing its header, sections, reflection, technologies, and related links.

## 3. Review independently and iterate

- Assign a reviewer agent other than the worker. Review the exact base-to-candidate diff. Read the surrounding code, callers, and tests, then trace the changed behaviour through the normal entry point. Keep implementation edits with the worker.
- Verify the task’s acceptance criteria and look for regressions, unclear responsibility boundaries, excessive indirection, unexplained logic, and missing or weak verification. Treat a concrete readability or modularity failure as blocking even when the tests pass. Identify what a maintainer must infer or trace and how that affects their understanding.
- Put feedback in the reviewer’s scratchpad under the same review ID and include the reviewed SHA. For each finding, give its blocking or advisory status, file and line, the concrete issue, and the change or evidence needed to resolve it. Record checks actually run and any verification limits.
- The worker records each resolution in its own scratchpad and submits the revised SHA under the same review ID. The reviewer checks the fixes and any new changes, then posts either remaining blockers or approval for that SHA. Repeat until the task’s definition of done is met. Use the shared scratchpads for every request, response, and handoff.

## 4. Definition of done

A task is complete only when all of the following hold.

- The acceptance criteria are verified through the relevant entry points, and the reviewed code meets the readability and modularity standards above.
- All configured tests pass, including every test added or changed on the branch. Any new automated check is included in `Taskfile.yml` so the full `task ci` sequence covers it.
- The assignment history has been reviewed and selectively squashed on the agreed integration base, and the final branch head has passed `task ci`. Record the exact SHA and actual results. A failed or unavailable required check leaves the task open.
- The reviewer has approved that same SHA with all blocking findings resolved. A later code change returns the candidate to review and CI.
- The completed scratchpad handoff records the approved SHA, any contract changes, and check results. Run `task ci` again after integrating dependent work.

## Scratchpad entries

```text
Worker   [API-02] Review requested | base <sha> | candidate <sha>
         Acceptance criteria, key decision and evidence, focused check results.
Reviewer [API-02] Changes requested | reviewed <sha>
         Blocking finding with file and line, impact, and expected resolution.
Worker   [API-02] Ready for re-review | candidate <sha>
         Resolution and current check results.
Reviewer [API-02] Approved | reviewed <sha>
Worker   [API-02] Complete | approved <sha> | task ci passed
```

Reference for review criteria. [Google Engineering Practices, What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html).
