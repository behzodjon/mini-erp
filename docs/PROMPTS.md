# Prompt log

The brief requires every prompt given to the AI to be documented. This file lists every prompt I sent, in order, word for word (typos included), each with a one-line note of what it produced. It is generated from the session transcripts, so nothing is paraphrased. Left out: `/compact` and `/model` housekeeping commands and two "[Request interrupted by user]" markers. `[Image #N]` marks a pasted screenshot. The Atlas connection string, which contains a password, is redacted. The agent's own questions are summarised in the notes so that the answers make sense. New prompts are appended as work continues.

## Session 1: planning

1. ```
/mattpocock-skills:grill-me https://telegra.ph/Texnik-topshiriq-Ichimliklar-dokoni-uchun-mini-ERP-10-20, i applied for product engineer positions,  yesterday after the interview i got this task, so help me to implement , let's plan
if you have any questions , feel free to ask
```
   → The agent fetched the brief and asked round 1 (Q1 time budget, Q2 stack, Q3 language, Q4 auth, Q5 deployment, Q6 stock ledger vs mutable balances, Q7 pieces/blocks, Q8 warehouse tree depth, Q9 loans excluded from P&L, Q10 cost-of-goods method, Q11 keep a prompt log).

2. ```
q1 i should deliver today after 8 hours
q2  they don't care any stack, so i think i should also show my tech skills, like clean architecture and so on, btw their stack[Image #1]
q3 he said that english or uzbek
q4 agree
q5 agree
q6 agree
q7agree
q8agree
q9agree
q10 ok, but what does moving weighted average mean?
q11 yes
```
   → Answers to round 1 (Image #1 = the Bito job post; its stack: Node.js/Fastify, MongoDB, Redis/BullMQ, React, Vue 3, Flutter, Kotlin). The agent explained moving weighted average and asked round 2 (Fastify+Mongo+React monorepo with clean architecture, Mongo transactions on a replica set, location per line, block negative stock, automatic cash entries, cash categories and counterparties, count at execution time, integer so'm, scope cuts, Uzbek UI / English docs, Render + Atlas).

3. ```
q1 agree
q2 yes
q3 i couldn't understand the question
q4 agree
q5 agree
q6 agree
q7agree
q8 agree
q9 agree
q10 yes
q11 agree
```
   → Answers to round 2. The agent re-explained per-line location and asked round 3 (default warehouse, product fields and the pieces-per-block lock, opening-balance purchase, owner contribution/withdrawal, report dates and numbering, report contents, repo and commits, the 8-hour plan).

4. ```
all agree
```
   → Agrees to everything in round 3.

5. ```
but don't start implementing yet
```
   → Stops the agent from starting implementation; planning only.

6. ```
/mattpocock-skills:to-spec
```
   → The agent proposed test seams (main seam: the HTTP API; domain functions only for the arithmetic) and asked where to save the spec.

7. ```
/mattpocock-skills:setup-matt-pocock-skills
```
   → Ran the skills setup in a separate session: issue tracker as local markdown under `.scratch/`, default triage labels, single-context domain docs.

8. ```
/mattpocock-skills:to-spec
```
   → Re-run of to-spec after the setup (interrupted once); the agent wrote `.scratch/beverage-shop-mini-erp/spec.md`.

9. ```
no wait i have done setup skills
```
   → Clarifies that the skills setup was already done.

10. ```
/mattpocock-skills:to-tickets
```
   → The agent proposed 12 tickets and suggested deploying a walking skeleton early.

11. ```
ok agrre
```
   → Approves the tickets; the agent wrote 13 ticket files (adding "02 Deploy the walking skeleton").

12. ```
/mattpocock-skills:handoff in a new session i'm gonna start to implement the tickets
```
   → The agent wrote a handoff document so implementation could start in a fresh session.


## Session 2: implementation

13. ```
/mattpocock-skills:implement ticket 01 [Image #1]
```
   → Image #1 = a screenshot of the handoff summary. The agent read ticket 01, the spec and the handoff, then built the walking skeleton test-first.

14. ```
wait frontend and backend are in the same repo?
```
   → A question about repository layout during the handoff; the project is one pnpm monorepo (API, web app and shared schemas).

15. ```
/mattpocock-skills:implement ticket 02
```
   → Code side of "Deploy the walking skeleton": static serving, SPA fallback, production build and start, a Render blueprint. Creating Atlas and Render and entering their env vars is left to the human.

16. ```
[Image #1] [Image #2] let's fix
```
   → Screenshots of a failed push (HTTP 403: git was sending a stale cached GitHub login); the agent diagnosed the cached credential and told me how to remove it.

17. ```
no i need behzodjon
```
   → Says which GitHub account the repository belongs to.

18. ```
1.https://github.com/behzodjon/mini-erp
2[Image #2] 
3[Image #3]
```
   → Deploy walkthrough, step 1: the GitHub repo URL and screenshots of the Atlas signup.

19. ```
[Image #4]
```
   → Deploy walkthrough: screenshot of the Atlas dashboard.

20. ```
[Image #5]
```
   → A short follow-up in the same flow.

21. ```
[Image #6]
```
   → A short follow-up in the same flow.

22. ```
[Image #7]
```
   → A short follow-up in the same flow.

23. ```
[Image #8]
```
   → A short follow-up in the same flow.

24. ```
[Image #9]
```
   → A short follow-up in the same flow.

25. ```
[Image #10]
```
   → A short follow-up in the same flow.

26. ```
[Image #11]
```
   → A short follow-up in the same flow.

27. ```
[Image #12]
```
   → A short follow-up in the same flow.

28. ```
[Image #13]
```
   → A short follow-up in the same flow.

29. ```
[Image #14] what should i do
```
   → Deploy walkthrough: asks what to do next in Atlas (cluster creation).

30. ```
[Image #15] i can't find passowrd
```
   → Deploy walkthrough: cannot find the database user's password.

31. ```
[redacted connection string]
```
   → The finished Atlas connection string (redacted here because it holds a password).

32. ```
[Image #16]
```
   → A short follow-up in the same flow.

33. ```
[Image #17]
```
   → A short follow-up in the same flow.

34. ```
[Image #18]
```
   → A short follow-up in the same flow.

35. ```
[Image #19]
```
   → A short follow-up in the same flow.

36. ```
/mattpocock-skills:implement ticket 03
```
   → Ticket 03 built test-first, then reviewed.

37. ```
yes fix
```
   → Applies the review fixes for ticket 03.

38. ```
/mattpocock-skills:implement ticket 04
```
   → Ticket 04 built test-first, then reviewed.

39. ```
yes
```
   → Accepts the recommendation for ticket 04's review.

40. ```
/mattpocock-skills:implement ticket 05
```
   → Ticket 05 built test-first, then reviewed.

41. ```
yes do that fix
```
   → Applies the review fix for ticket 05.

42. ```
/mattpocock-skills:implement ticket 06
```
   → Ticket 06 built test-first, then reviewed.

43. ```
yes fix them
```
   → Applies the review fixes for ticket 06.

44. ```
/mattpocock-skills:implement ticket 07
```
   → Ticket 07 built test-first, then reviewed.

45. ```
ok fix them
```
   → Applies the review fixes for ticket 07.

46. ```
/mattpocock-skills:implement ticket 08
```
   → Ticket 08 built test-first, then reviewed.

47. ```
/mattpocock-skills:implement ticket 09
```
   → Ticket 09 built test-first, then reviewed.

48. ```
ok fix them
```
   → Applies the review fixes for ticket 09.

49. ```
/mattpocock-skills:implement ticket 10
```
   → Ticket 10 built test-first, then reviewed.

50. ```
yes apply those fixes
```
   → Applies the review fixes for ticket 10.

51. ```
/mattpocock-skills:implement ticket 11
```
   → Ticket 11 built test-first, then reviewed.

52. ```
ok fix them
```
   → Applies the review fixes for ticket 11.

53. ```
/mattpocock-skills:implement ticket 12
```
   → Ticket 12: the seed script, built through the use cases, with tests and a review.

54. ```
ok apply fixes
```
   → Applies the review fixes for ticket 12.

55. ```
yes
```
   → Approves pushing to GitHub, which triggers the Render deploy.

56. ```
[Image #20] ok it's live
```
   → Screenshot of the live login page.

57. ```
ran the seed command
```
   → Ran `pnpm seed` (it seeded the local database, not Atlas).

58. ```
[Image #21]
```
   → Terminal output of the seed run.

59. ```
ok how can i get auth credentials to log in
```
   → Asks how to obtain the login credentials.

60. ```
[Image #22] where is environement section?
```
   → Cannot find the Environment section in the Render settings; the agent gave the direct URL.

61. ```
[Image #23]
```
   → Screenshot of the logged-in home page.

62. ```
[Image #24]
```
   → Screenshot of the empty Mahsulotlar page: production had no data yet.

63. ```
do this yourself
```
   → Asks the agent to seed Atlas itself; the agent declined to extract the connection string and added a `seed:prod` script that reads a gitignored `.env.production` the user fills in.

64. ```
ok done
```
   → Filled in `.env.production`; the agent seeded Atlas.

65. ```
ok i see the data
```
   → Confirms the seeded data is visible on the live site.

66. ```
[Image #25]
```
   → Live smoke test: screenshot of the purchase form.

67. ```
[Image #26]
```
   → Live smoke test: the purchase executed.

68. ```
[Image #27] [Image #28]
```
   → Live smoke test: Kassa and the stock report after the purchase.

69. ```
[Image #29]
```
   → Live smoke test: the sale form.

70. ```
[Image #30]
```
   → Live smoke test: the sale executed.

71. ```
[Image #31] [Image #32]
```
   → Live smoke test: Kassa and stock after the sale.

72. ```
[Image #33]
```
   → Live smoke test: the cash form.

73. ```
[Image #34]
```
   → Live smoke test: the expense entry in Kassa.

74. ```
[Image #35]
```
   → Live smoke test: the Foyda va zarar report; the agent checked the arithmetic.

75. ```
yes fix those items
```
   → Approves fixing the home-page placeholder and the ticket 02 leftovers: redirect `/` to Hisobotlar, 503 health when the database is down, 404 for missing assets, 4xx errors stay 4xx, `.node-version`.

76. ```
/mattpocock-skills:implement ticket 13
```
   → Ticket 13: this documentation.

