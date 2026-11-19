# Developer escalation and approval

Applies to every worker and reviewer. The Developer is the human directing the assessment. Use the shared scratchpads for agent coordination and the session’s user-facing channel for a decision from the Developer.

## Stop and ask the Developer

- **Clarification or assistance.** Stop when the brief, plans, or handoff conflict, or when missing input, access, or a decision blocks a correct implementation or required verification. Ask the smallest question that will unblock the assignment. Use the agreed plan for routine decisions within the assignment.
- **Cross-system deviation.** Obtain explicit Developer approval before implementing or directing a departure from the approved plan that would affect any other part of the system or another agent’s implementation. Examples include changes to shared types, API contracts, database schema, URLs, startup and CI contracts, acceptance criteria, or file ownership. If the impact is unclear, ask before acting. Reviewer feedback and agreement from another agent are evidence for the request. Approval comes from the Developer.
- **Repeated blocker.** Stop after **three unsuccessful attempts on the same blocker**. An attempt is a targeted fix followed by a check or re-review that shows the blocker persists. Count attempts on the same underlying problem across candidate revisions. Stop and request Developer input after the third unsuccessful attempt. Resume the assignment only after receiving that input.

## Send the request and pause

1. Mark the assignment `Waiting for Developer` in your scratchpad. Record the task and blocker or review ID, the current branch or SHA, the evidence and attempts so far, and the exact decision needed. For a proposed deviation, state the plan change, affected assignments or contracts, and the recommended option.
2. Send the request to the Developer through the current session’s user-facing or approval channel. Stop assignment work while the decision is pending.
3. If the Developer has not responded within **60 seconds** of the request, pause the session. Where the interface has no pause control, end the turn with `Waiting for Developer` and the pending decision. Resume only after the Developer’s feedback arrives. A cross-system deviation still requires explicit approval.
4. Record the Developer’s decision and its scope in the scratchpad on resumption. Follow the approved direction and make the updated contract visible to affected agents through the shared scratchpads.

Example request

```text
Waiting for Developer | Task 3 | API-04 | <current SHA>
Decision needed | <specific clarification or approval>
Evidence | <conflicting plans, failed checks, or attempts 1–3>
Impact | <affected contract, files, and assignments>
Recommendation | <proposed action and why>
```
