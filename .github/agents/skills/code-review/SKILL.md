---
name: code-review
description: Review a proposed code change, diff, or worker candidate independently. Use for initial reviews and re-reviews when checking correctness, readability, modularity, test evidence, and task acceptance criteria, including scratchpad handoffs between agents.
---

# Code review

## Establish the target

1. Read the assignment, applicable `AGENTS.md`, task criteria, and testing guidance. For an agent review, read the worker’s scratchpad request and retain the review ID, base SHA, candidate SHA, contract changes, and check evidence.
2. Verify the commits and review the diff for that range. Inspect changed code, callers, existing tests, and the normal user or API entry point. Keep implementation and test files read-only. Use a separate checkout when executing a candidate’s checks requires one.
3. If the exact target is unclear, record what is needed to resolve it. Tie approval to an identified candidate SHA.

## Apply the same review pass

- Compare the behaviour with the definition of done and trace success, failure, and relevant boundaries through the actual execution path. Check regressions and effects on callers and public contracts.
- Read the entry point in execution order. Check that names make decisions, side effects, and errors easy to find, that focused functions or components own distinct responsibilities, and that the composition remains visible. Flag both oversized units and unnecessary indirection.
- For necessary complexity, check that a nearby comment explains the reason, invariant, edge case, or framework constraint. Check that public contracts and material trade-offs are documented where callers will find them.
- Check the tests against the changed behaviour and repository standards. Look for risk-based cases, meaningful assertions, and coverage at the boundary that actually enforces the rule; do not require a fixed quota per unit. Check that any new automated check participates in local CI.
- Verify non-obvious framework or dependency behaviour against the installed version. Use official documentation, a documentation MCP when available, repository source, or a focused local check. Record the evidence that resolves the question.
- Run the narrowest useful checks where practical. Record the command and observed outcome, or the verification limit. Attribute worker-provided results to the worker.

## Record findings and re-review

- For agent-to-agent review, write only to the reviewer’s own shared scratchpad, using the same review ID. Read worker replies from the worker’s scratchpad. Use the location given in the task or worktree rules. If none is specified, resolve the common Git directory and look under `agent-scratchpads/`.
- Start the entry with the reviewed SHA and a status of `Changes requested`, `Verification pending`, or `Approved`. For each finding, give its ID, blocking or advisory status, file and line, what goes wrong or is difficult to understand, and a specific fix direction or required evidence. Order findings by impact.
- Treat a concrete readability or modularity failure as blocking, even with passing tests. Keep personal preferences advisory and identify the relevant repository rule where one applies.
- On re-review, check the worker’s resolutions and everything changed since the prior candidate. Confirm that the revised full change meets the task criteria. Record approval for the exact reviewed SHA after blocking findings are resolved and review evidence is sufficient.
- Keep review approval and the integration gate explicit. Completed handoff requires a full passing local CI result for the same SHA, including any added tests. Record outstanding CI or acceptance checks as pending for handoff. Any subsequent implementation change needs fresh review and CI.

Example scratchpad entry

```text
[API-02] Changes requested | reviewed <sha>
B1 | Blocking | <path>:<line> | <problem and impact> | <required change or evidence>
Checks | <commands and outcomes or verification limits>
```
