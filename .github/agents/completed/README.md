# Assignment completion records

At the start of each assignment, copy [record-template.md](record-template.md) to a file named for the assignment, such as `task-03-query-api.md`. The assignment owner writes the record in their worktree and includes it in the final candidate.

Keep the record current during planning, implementation, and review. Record every change, deviation, improvisation, and assumption, including changes to tests or verification. Group closely related edits in one entry. Record decisions that were revised or reverted so the Developer can follow how the work changed.

For each entry, capture:

- The stage and the relevant plan, brief, or original expectation.
- What changed, what was improvised, or what was assumed.
- Why the agent made the decision, with relevant evidence.
- The affected files, contracts, or assignments, and the resulting outcome.
- The Developer’s decision and reference when approval or clarification was required.

Follow the [developer escalation rules](../standards/agent-escalation-rules.md) before implementing any deviation that affects another part of the system. Record the approved scope and the resulting change.

Reviewers record their own assumptions, findings, and verification limits in their scratchpads. The assignment owner carries the relevant points and resulting changes into the completion record. The reviewer checks the record alongside the candidate diff.

Use scratchpads for live questions, feedback, and handoffs. Include the record path in the completed handoff. Keep exact final-SHA approval and CI evidence in the scratchpad so the record can be committed and reviewed as part of that same candidate.
