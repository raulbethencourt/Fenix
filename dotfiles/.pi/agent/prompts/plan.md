---
description: Plan a task, show the plan, get approval, then implement
argument-hint: <task description>
---

Your task: $ARGUMENTS

Follow these steps exactly:

1. Call the `planner` subagent with the task: "$ARGUMENTS"
2. Send the planner's complete output verbatim as your assistant message — do not summarize or truncate it.
3. Call `ask_user_question` with:
   - question: "Approve this plan and proceed?"
   - options: [{ label: "Yes, implement it", value: "yes" }, { label: "No, cancel", value: "no" }]
4. If the answer is "yes" or "Yes, implement it": call the `worker` subagent passing the original task description and the full plan as context.
5. If the answer is "no" or "No, cancel": stop immediately and reply "Plan cancelled."
