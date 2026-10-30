# Prompt log

The brief requires every prompt given to the AI to be documented. This file records them in order, word for word, typos included. The agent's numbered questions (Q1, Q2, …) are summarised in brackets so the answers make sense. New prompts are appended as work continues.

## Session 1: planning

1. `/mattpocock-skills:grill-me https://telegra.ph/Texnik-topshiriq-Ichimliklar-dokoni-uchun-mini-ERP-10-20, i applied for product engineer positions,  yesterday after the interview i got this task, so help me to implement , let's plan`
   `if you have any questions , feel free to ask`
   → The agent fetched the brief and asked round 1:
   - [Q1 time budget, Q2 stack, Q3 language, Q4 auth, Q5 deployment, Q6 stock ledger vs mutable balances]
   - [Q7 pieces/blocks model, Q8 warehouse tree depth, Q9 loans excluded from P&L, Q10 cost-of-goods-sold method, Q11 keep a prompt log]
2. `q1 i should deliver today after 8 hours / q2  they don't care any stack, so i think i should also show my tech skills, like clean architecture and so on, btw their stack[Image #1] / q3 he said that english or uzbek / q4 agree / q5 agree / q6 agree / q7agree / q8agree / q9agree / q10 ok, but what does moving weighted average mean? / q11 yes`
   (Image #1 = the Bito job post. Its stack: Node.js (Fastify), MongoDB, Redis/BullMQ, React, Vue 3, Flutter, Kotlin; nice-to-haves: TypeScript, MongoDB and API design, understanding of accounting, trade and warehouse processes.)
   → The agent explained moving weighted average and asked round 2:
   - [Q1 Fastify+Mongo+React monorepo with clean architecture, Q2 Mongo transactions on a replica set, Q3 location per line, Q4 block negative stock]
   - [Q5 automatic cash entries for sales and purchases, Q6 cash categories + counterparties, Q7 stock count at execution time, Q8 UZS as integer so'm]
   - [Q9 scope cuts + tests, Q10 Uzbek UI / English technical docs, Q11 Render + Atlas]
3. `q1 agree / q2 yes / q3 i couldn't understand the question / q4 agree / q5 agree / q6 agree / q7agree / q8 agree / q9 agree / q10 yes / q11 agree`
   → The agent re-explained per-line location and asked round 3:
   - [Q1 per-line location with a default warehouse, Q2 product fields and pieces-per-block lock, Q3 opening-balance purchase, Q4 owner contribution/withdrawal]
   - [Q5 report dates and document numbering, Q6 report contents, Q7 repo and commits, Q8 8-hour plan]
4. `all agree`
5. `but don't start implementing yet` (sent after interrupting a tool-version check)
6. `/mattpocock-skills:to-spec` → the agent proposed test seams (main seam: the HTTP API; domain functions only for the arithmetic) and asked where to save the spec
7. `/mattpocock-skills:to-spec` (re-run) → interrupted by: `no wait i have done setup skills` → the agent wrote `.scratch/beverage-shop-mini-erp/spec.md`
8. `/mattpocock-skills:to-tickets` → the agent proposed 12 tickets and suggested deploying the skeleton early
9. `ok agrre` → the agent wrote 13 ticket files (adding "02 Deploy the walking skeleton")
10. `/mattpocock-skills:handoff in a new session i'm gonna start to implement the tickets` → the agent wrote a handoff document

## Session 2: implementation

11. `/mattpocock-skills:implement ticket 01 [Image #1]`
    (Image #1 = a screenshot of the handoff summary from the end of session 1.)
    → The agent read ticket 01, the spec and the handoff document, then built the walking skeleton test-first.
