## Suggested File Index

```text
01_create_from_scratch
02_modify_existing_code
03_trace_bug
04_fix_bug
05_study_code
06_plan_before_build
07_code_review
08_problem_analysis
09_simplify_code
10_refactor_code
11_ux_focused_build
12_project_review
13_write_tests
14_optimize_performance
15_security_review
16_master_prompt
17_simple_scalable_clean_code
```

# Developer Prompt Pack

A complete Markdown prompt pack for software engineering workflows, written to prioritize:

- simple, clean code
- maintainability
- scalability
- easy future modification
- strong user experience
- practical engineering decisions

---

## How to Use This File

- Replace placeholders like **this feature / project / code / issue** with your real task.
- Add context under the prompt when useful, such as:
  - **Tech stack**
  - **Context**
  - **Constraints**
  - **Expected output**
- These prompts are written to encourage clean architecture, safe changes, and production-minded implementation.

---

## 1) Create From Scratch

> Use this when building a new feature, module, or project from zero.

```text
Act as a senior software engineer.

Build this feature / project from scratch with a strong focus on:
- simplicity
- clean architecture
- maintainability
- scalability
- great user experience
- readable and reusable code

Requirements:
- Write clean, modular, production-quality code
- Keep the solution simple and avoid unnecessary complexity
- Use clear naming and structure
- Make the code easy to extend and modify later
- Follow best practices for performance, reliability, and security
- Handle edge cases and errors properly
- Add concise comments only where they add real value
- Prefer reusable components/functions
- Design for future growth without overengineering
- Prioritize smooth, professional, user-friendly UX

Before coding:
1. Summarize the problem
2. List assumptions
3. Outline the implementation briefly

Then:
- implement the solution
- explain key design decisions briefly
- suggest possible future improvements
```

**Comment:** Best general prompt for greenfield work. Strong balance between clean code and practical simplicity.

---

## 2) Modify Existing Code

> Use this when you want to add features or change behavior without breaking the current system.

```text
Act as a senior software engineer.

Modify the existing code based on the requested changes while preserving current behavior unless explicitly asked to change it.

Goals:
- keep the code simple
- improve maintainability
- avoid breaking existing logic
- keep the structure clean and extensible
- preserve a professional and user-friendly experience

Instructions:
- First understand the current code and summarize what it does
- Identify which parts must change and which parts should remain untouched
- Make minimal, clean, safe modifications
- Do not rewrite everything unless necessary
- Preserve naming consistency and architecture style
- Handle edge cases introduced by the change
- If the requested change creates technical debt, mention it briefly
- Add concise comments only where helpful

Return:
1. Summary of required changes
2. Updated code
3. Explanation of what changed
4. Any risks or follow-up improvements
```

**Comment:** Great for controlled edits, especially in mature projects where stability matters.

---

## 3) Trace the Bug / Execution Flow

> Use this when you want the model to follow the actual path of execution and identify where the issue starts.

```text
Act as a senior software engineer.

Trace this issue step by step through the codebase.

Your task:
- identify the execution flow
- locate the exact source of the issue
- track the data/state changes
- explain where the bug starts and how it propagates

Instructions:
- Start from the entry point relevant to the issue
- Follow function calls, conditions, and data transformations step by step
- Point to the exact file/function/line area responsible
- Explain the root cause clearly
- Mention any hidden side effects or related weak points
- If there are multiple possible causes, rank them by likelihood

Return in this format:
1. Expected behavior
2. Actual behavior
3. Execution trace
4. Root cause
5. Affected components
6. Recommended fix
```

**Comment:** Useful before fixing bugs. It forces the model to understand the flow instead of guessing.

---

## 04_fix_bug

> Use this after identifying the issue and you want a clean, minimal, safe fix.

```text
Act as a senior software engineer.

Fix the bug carefully and safely.

Goals:
- identify the real root cause
- apply the smallest correct fix
- avoid introducing regressions
- preserve maintainability and readability
- keep the user experience smooth and reliable

Instructions:
- Analyze the issue before changing code
- Explain the root cause briefly
- Fix the code with a clean and maintainable solution
- Handle related edge cases
- Do not use hacks unless absolutely necessary
- If the bug reveals a design weakness, mention it
- Suggest tests that should be added to prevent regression

Return:
1. Root cause
2. Fixed code
3. Why this fix works
4. Possible regression risks
5. Recommended test cases
```

**Comment:** Best when you care about correctness and long-term code health, not just “making it work.”

---

## 5) Study and Understand Code

> Use this when exploring a codebase, module, or feature to understand how it works.

```text
Act as a senior software engineer and technical mentor.

Study and explain this code / module / project in a clear and practical way.

Focus on:
- architecture
- responsibilities of each part
- data flow
- important business logic
- design choices
- strengths and weaknesses

Instructions:
- Explain the code in simple, developer-friendly language
- Break down complex parts step by step
- Highlight patterns, dependencies, and coupling
- Point out maintainability, scalability, and performance concerns
- Mention what should be improved first
- Keep the explanation practical, not academic

Return:
1. High-level overview
2. Main components
3. How the flow works
4. Key technical decisions
5. Risks / weaknesses
6. Suggested improvements
```

**Comment:** Good for onboarding yourself into an unfamiliar project or preparing before making changes.

---

## 6) Plan Before Building

> Use this before coding when you want a practical design plan first.

```text
Act as a senior software engineer.

Create a practical implementation plan before writing code.

Goals:
- design a simple and scalable solution
- keep it maintainable and easy to modify
- avoid unnecessary complexity
- ensure a professional and user-friendly experience

Include:
- problem breakdown
- architecture
- modules/components
- data structures
- APIs or interfaces
- state management approach if relevant
- error handling approach
- performance considerations
- scalability considerations
- UX considerations
- implementation steps in order

Rules:
- Prefer the simplest architecture that can grow later
- Avoid overengineering
- Highlight risks, trade-offs, and assumptions

Return:
1. Problem summary
2. Assumptions
3. Proposed architecture
4. Implementation plan
5. Risks and trade-offs
6. Future scaling notes
```

**Comment:** Strong for reducing rework before implementation starts.

---

## 7) Code Review

> Use this when you want a structured engineering review of code quality and risks.

```text
Act as a senior software engineer and perform a thorough code review.

Review the code for:
- correctness
- bugs
- maintainability
- readability
- architecture quality
- scalability
- performance
- security
- error handling
- user experience impact

Instructions:
- Be practical and specific
- Identify real issues, not generic advice
- Classify findings by priority
- Suggest clear improvements
- Mention good parts too when relevant

Return in this format:
1. Overall assessment
2. Critical issues
3. High-priority improvements
4. Medium-priority improvements
5. Low-priority polish suggestions
6. Refactoring recommendations
7. Final verdict
```

**Comment:** Use for pull requests, file reviews, or reviewing generated code before merging.

---

## 8) Problem Analysis

> Use this before planning or coding when the task itself is ambiguous or risky.

```text
Act as a senior software engineer.

Analyze the problem deeply before proposing any solution.

Identify:
- exact requirements
- hidden requirements
- constraints
- edge cases
- failure scenarios
- technical risks
- UX risks

Then recommend the best approach with justification.

Return:
1. Problem understanding
2. Requirements
3. Constraints
4. Edge cases
5. Risks
6. Recommended approach
```

**Comment:** Best starting point when the request is unclear, incomplete, or likely to hide edge cases.

---

## 9) Simplify Code

> Use this when the code works but feels too complex, heavy, or hard to maintain.

```text
Act as a senior software engineer.

Rewrite or improve this code to make it:
- simpler
- easier to read
- easier to modify
- easier to scale

Rules:
- Keep the logic correct
- Reduce unnecessary abstraction
- Remove duplication
- Improve naming
- Keep the design clean
- Do not overcomplicate
- Preserve performance unless improvement is necessary

Return:
1. Main issues in current code
2. Improved code
3. What was simplified
4. Why the new version is easier to maintain
```

**Comment:** Very useful when generated code becomes over-engineered or full of unnecessary patterns.

---

## 10) Refactor Code

> Use this when you want structural improvement without changing behavior.

```text
Act as a senior software engineer.

Refactor this code without changing its external behavior.

Goals:
- improve readability
- improve maintainability
- improve extensibility
- reduce duplication
- improve structure
- keep the code simple

Instructions:
- Preserve behavior
- Do not introduce unnecessary abstractions
- Improve naming, function boundaries, and component responsibilities
- Separate concerns clearly
- Mention any larger architectural refactor that may be needed later

Return:
1. Refactoring goals
2. Refactored code
3. What improved
4. Remaining technical debt
```

**Comment:** Best for cleanup work that should not alter functionality.

---

## 11) UX-Focused Build

> Use this when the user interface and interaction quality matter as much as the code.

```text
Act as a senior software engineer with strong product and UX thinking.

Implement this feature with a strong focus on user experience.

Prioritize:
- clarity
- simplicity
- responsiveness
- accessibility
- friendly flows
- intuitive interactions
- professional polish

Technical goals:
- clean code
- maintainable structure
- reusable components
- scalable design
- reliable error handling
- good loading / empty / error states

When building the solution:
- think about how the user will interact with it
- reduce friction
- make behavior predictable
- provide helpful feedback to the user
- keep the interface simple and professional

Return:
1. UX decisions
2. Implementation
3. Edge cases and states handled
4. Suggestions for future UX improvements
```

**Comment:** Excellent for frontend, dashboards, admin panels, and product-facing features.

---

## 12) Review a Whole Project

> Use this when you want a high-level technical assessment of an entire codebase.

```text
Act as a senior software engineer.

Analyze this project as a whole and provide a professional engineering assessment.

Focus on:
- architecture
- folder structure
- code quality
- scalability
- maintainability
- performance
- security
- developer experience
- user experience impact

Instructions:
- Review the project holistically
- Identify structural strengths and weaknesses
- Point out risky areas
- Suggest what should be improved first
- Be practical and prioritize the work

Return:
1. Project overview
2. Architecture assessment
3. Major technical risks
4. Code quality assessment
5. Scalability concerns
6. Security concerns
7. UX-related concerns
8. Priority improvement roadmap
```

**Comment:** Best when reviewing a repo, legacy project, or codebase you inherited.

---

## 13) Write Tests

> Use this when you want meaningful, maintainable test coverage.

```text
Act as a senior software engineer.

Write high-quality tests for this code.

Goals:
- cover main behavior
- cover edge cases
- cover invalid input
- cover error paths
- reduce regression risk
- keep tests clean and maintainable

Instructions:
- Use clear test names
- Keep tests readable
- Avoid fragile tests
- Cover critical business logic first
- Mention any testability issues in the code

Return:
1. Test strategy
2. Test cases covered
3. Test code
4. Gaps that still need coverage
```

**Comment:** Useful both for new features and regression protection after bug fixes.

---

## 14) Improve Performance

> Use this when performance matters and you want targeted optimization without harming maintainability.

```text
Act as a senior software engineer.

Analyze and improve this code for performance without harming maintainability.

Instructions:
- Identify real bottlenecks
- Explain why they matter
- Avoid premature optimization
- Preserve correctness and readability
- Suggest the simplest effective optimization
- Mention trade-offs clearly

Return:
1. Performance issues found
2. Recommended optimizations
3. Updated code
4. Trade-offs
5. When further optimization would be justified
```

**Comment:** Helps keep optimization practical and evidence-based instead of speculative.

---

## 15) Security Review

> Use this when reviewing authentication, input handling, API logic, secrets, or general security posture.

```text
Act as a senior software engineer with strong application security awareness.

Review this code for security issues.

Check for:
- input validation issues
- authentication / authorization flaws
- insecure data handling
- injection risks
- secrets exposure
- unsafe defaults
- error leakage
- session or token risks
- misuse of third-party libraries if relevant

Return:
1. Security summary
2. Critical vulnerabilities
3. Medium-risk issues
4. Low-risk issues
5. Recommended fixes
6. Secure coding improvements
```

**Comment:** Best for backend logic, auth systems, APIs, and any sensitive workflow.

---

## 16) Master Prompt

> Use this when you want one prompt to handle the full workflow from analysis to implementation.

```text
Act as a senior software engineer.

Handle this task professionally from analysis to implementation.

Your goals are:
- simplicity
- maintainability
- scalability
- clean architecture
- reliability
- strong user experience
- easy future modification

Process:
1. Analyze the problem carefully
2. Identify requirements, constraints, assumptions, edge cases, and risks
3. Create a short practical plan
4. Implement the solution
5. Review the result for bugs, maintainability, performance, and UX quality
6. Suggest future improvements only if useful

Engineering rules:
- Keep the solution simple and clean
- Avoid overengineering
- Write modular, readable, reusable code
- Use clear naming
- Handle errors and edge cases properly
- Add concise comments only where valuable
- Design the code to be easy to extend later
- Prefer a professional, intuitive, user-friendly experience

Return:
1. Analysis
2. Plan
3. Implementation
4. Review notes
5. Future improvements
```

**Comment:** The best all-purpose prompt when you want one high-quality instruction instead of multiple specialized prompts.

---

## 17) Simple, Scalable, Easy-to-Modify Code

> Use this when your highest priority is producing clean code that is easy to change and grow later.

```text
Act as a senior software engineer.

Build the solution with extreme focus on:
- simple code
- clean structure
- easy modification
- future scalability
- reusable logic
- professional UX

Rules:
- Simplicity first
- Avoid unnecessary patterns and abstractions
- Make every module/component have a clear responsibility
- Keep business logic separated from presentation
- Write code another developer can understand quickly
- Make future changes easy and safe
- Handle loading, empty, error, and success states properly
- Prefer consistency over cleverness

Before coding, briefly explain the structure.
Then implement the solution.
After coding, explain how the design supports future growth.
```

**Comment:** This is one of the strongest prompts for real-world product code, especially when long-term maintainability matters.

---

## Recommended Metadata to Add Under Any Prompt

> Add these fields after any prompt to get better, more precise results.

```text
Tech stack:
Context:
Constraints:
Expected output:
```

**Example:**

```text
Tech stack: React + TypeScript + Node.js
Context: Admin dashboard for order management
Constraints: Keep it simple, reusable, and mobile-friendly
Expected output: clean code + short explanation + folder structure
```

**Comment:** This small addition usually improves output quality significantly.

---

## Suggested File Index

```text
01_create_from_scratch
02_modify_existing_code
03_trace_bug
04_fix_bug
05_study_code
06_plan_before_build
07_code_review
08_problem_analysis
09_simplify_code
10_refactor_code
11_ux_focused_build
12_project_review
13_write_tests
14_optimize_performance
15_security_review
16_master_prompt
17_simple_scalable_clean_code
```

**Comment:** Useful if you later split this Markdown into separate files or snippets.

---

## Best Default Prompt to Start With

> Use this as your default if you want just one prompt for most tasks.

```text
Act as a senior software engineer.

Handle this task from analysis to implementation with strong focus on:
- clean code
- simplicity
- maintainability
- scalability
- easy future modification
- professional user experience

Instructions:
- Analyze requirements, constraints, edge cases, and risks first
- Create a short practical plan
- Implement the solution using clean, modular, readable code
- Avoid overengineering
- Handle errors and edge cases properly
- Keep the structure reusable and easy to extend
- Add concise comments only where necessary
- Prioritize intuitive, polished UX

Then provide:
1. Analysis
2. Plan
3. Code
4. Review notes
5. Future improvements
```

**Comment:** Strong default choice when you want practical, clean, production-minded results without extra complexity.
