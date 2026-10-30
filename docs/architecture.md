# Architecture

This document explains why the system is built the way it is, and what was rejected. The product is a mini-ERP for one beverage shop: stock, purchases, sales, a cash register, and three reports. Live demo: https://beverage-shop-erp.onrender.com

## 1. Net profit: loans and owner money are not profit

The brief asks for net profit "taking loans into account". The interpretation here is that **loans are tracked, but kept out of profit**.

Money passes through the shop's cash register for very different reasons:

| Money movement | Moves cash? | Is it profit or loss? |
|---|---|---|
| Sale | yes (in) | **Revenue** |
| Purchase of goods | yes (out) | No. The cost reaches profit later, as cost of goods sold, when the goods are sold. |
| Travel cost (yo'l kira), rent, salary | yes (out) | **Operating expense** |
| Other income | yes (in) | **Other income** |
| Loan received | yes (in) | No. It is a debt, not earnings. |
| Loan repayment paid | yes (out) | No. It settles a debt. |
| Loan given | yes (out) | No. It is a claim on someone, not a cost. |
| Loan repayment received | yes (in) | No. It collects a claim. |
| Owner contribution / opening cash | yes (in) | No. The owner's own money going in. |
| Owner withdrawal | yes (out) | No. Taking profit home is not a cost of doing business. |

If a 3,000,000 so'm loan counted as income, borrowing money would make the shop look 3 million more profitable, and repaying it would look like a loss. The owner would read the P&L and conclude the wrong thing. So:

- The **P&L** report contains only revenue, cost of goods sold, operating expenses, stock count results and other income. Loans and owner money never appear there.
- The **Cash & debts** panel shows what P&L leaves out: the cash balance, who owes the owner, and whom the owner owes. It sits on the same screen so the owner still sees the whole picture.

The classification lives in one table, `domain/cash-category.ts`. Each cash category declares its direction, its P&L effect and whether it needs a counterparty. Validation, the P&L and the debt panel all read that table, so they cannot disagree about what a category means. Debts per counterparty are loans given minus repayments received ("owed to me"), and loans received minus repayments paid ("I owe").

```
Revenue (executed sales)
− Cost of goods sold (quantity × average cost at the time of sale)
= Gross profit
− Operating expenses (by category)
± Stock count shortage / surplus (at average cost)
+ Other income
= Net profit
```

A negative cash balance is shown in red instead of being blocked. A missing opening cash entry should not stop the owner from working.

## 2. Stock: an append-only ledger with cached balances

Every change to stock is a row in a **movement ledger**: product, warehouse node, signed quantity in pieces, unit cost, the source document, and the execution time. Nothing is ever updated or deleted in it.

A **cached balance** per (product, warehouse node) is updated in the same transaction as the movement. Reads of "how much is where" are one lookup, and the ledger remains the source of truth: a balance can always be rebuilt by summing movements.

Alternatives rejected:

- **A mutable `quantity` field only.** Simple, but it has no history. When a number looks wrong, nothing can explain it, and a stock count could not show what changed.
- **Ledger only, summed on every read.** Auditable, but every stock screen would aggregate the whole history. The cache keeps reads cheap, and the same-transaction update keeps it honest.

## 3. Documents: draft, then execute, atomically

Purchases, sales and stock counts are created as **drafts**, which can be edited and deleted, and are **executed** in a separate action. Only execution touches stock and cash. An executed document is read-only. (The fourth kind, a manual cash entry, has no draft step.)

Execution is one **MongoDB multi-document transaction**. It covers the status flip, the movements, the balance updates, the average cost updates, the automatic cash entry, and the recorded cost of goods sold. Either all of it happens, or none of it does. A sale that asks for more than a location holds is refused with an error naming the line, and nothing changes.

The status flip is a conditional update ("only if still `draft`"), so a double click or a retried request cannot post a document twice: the second attempt finds no draft and fails with a conflict. The transaction runs in `session.withTransaction`, which retries transient errors such as write conflicts.

**Why a replica set.** MongoDB only supports multi-document transactions on a replica set. Locally, `docker-compose.yml` starts a single-node replica set. In production, Atlas is a replica set already. Tests start an in-memory replica set so the transactions are exercised for real.

Alternatives rejected:

- **Compensating writes (undo on failure).** A crash between steps would leave stock changed without cash, or the reverse. A transaction cannot be half done.
- **Optimistic checks without a transaction.** Two concurrent sales of the last box could both pass the check.

Document numbers (`XAR-0001` purchases, `SAV-` sales, `INV-` counts, `KAS-` manual cash entries) come from an atomic counter and are assigned at creation, so the owner can say "sale SAV-0007".

## 4. Cost of goods sold: moving weighted average

Each product keeps one **average cost per piece**, across all warehouse nodes. On each purchase:

```
newAverage = (onHand × currentAverage + purchaseTotal) / (onHand + purchasedPieces)    rounded to whole so'm
```

For example: 100 pieces on hand at 5,000, then 50 pieces bought for 280,000 in total: (100 × 5,000 + 280,000) / 150 = 5,200 per piece. If nothing (or less) is on hand, the average is simply the price just paid. Sales and count shortages use the current average without changing it. Count surpluses are valued at it.

Each executed sale line stores the average cost it used, so reports read historical cost of goods sold directly. A later purchase at another price never rewrites past profit.

**Why not FIFO.** FIFO needs a tracked layer for every receipt, and the shop sells interchangeable drinks without batch tracking. Moving average gives the same answer in total for identical goods, is cheap to compute, and is easy for the owner to follow. FIFO and batch costing are listed under next steps.

## 5. Quantities: integer pieces, fixed pieces per block

Everything is stored as **integer pieces**. Each product has a `piecesPerBlock` (a positive integer), and the UI shows 293 pieces as "24 blok + 5 dona". Document lines remember the unit the owner typed (piece or block) and its price, plus the normalised pieces and price per piece, so a line shows as entered while all arithmetic is in pieces. Money is integer so'm, so there are no floating-point cents.

`piecesPerBlock` locks once the product has any movement. Otherwise changing 12 to 10 would silently rewrite every historical "blocks" figure.

Alternatives rejected: fractional quantities and decimal money, which invite rounding drift; and multiple pack sizes per product, which is out of scope.

## 6. Warehouses: a tree with ancestor paths

Warehouses form a tree of any depth, and **any node may hold stock**, not only the leaves (the floor of the main warehouse holds goods too). Each node stores the ids of its ancestors, so "everything under this node" is one indexed query with no recursion, and the stock-by-warehouse report rolls child totals up into parents. A node can only be deleted when it has no children and no stock.

Average cost is per product, not per node, because a bottle bought into the fridge costs the same as one on the shelf.

## 7. Clean architecture and the composition root

```
apps/api/src
  domain/          pure rules: quantity conversion, average cost, document states,
                   stock sufficiency, count differences, cash categories, P&L
  application/     use cases (one per intent) and ports (repository, unit-of-work interfaces)
  infrastructure/  MongoDB repositories, the transaction adapter, bcrypt
  http/            Fastify routes, session cookie, error mapping
  composition-root.ts   the one place that wires everything
```

Dependencies point inward only. The domain imports nothing; use cases depend on **ports**, not on MongoDB; the adapters implement the ports. `test/architecture.test.ts` fails the build if domain or application code imports Fastify, MongoDB, bcrypt, or the infrastructure or HTTP layers. The composition root builds the concrete adapters and hands them to the use cases by plain function arguments. **No DI framework**: constructor wiring in one file is easier to read than decorators and containers at this size.

Domain errors (insufficient stock, already executed, not found) are mapped to HTTP statuses in one place, `http/error-handler.ts` (409, 409, 404; validation errors are 400). Request and response shapes are Zod schemas in `packages/shared`, used by both the API and the web app, so the contract is defined once.

In production Fastify also serves the built web app, so there is **one service, one URL and no CORS**.

## 8. Auth

One owner account. The username and a bcrypt password hash come from environment variables; nothing is stored in the database. Login sets a signed, httpOnly session cookie (secure in production). Every route except login and health requires it, and routes opt out explicitly with `config.public`, so a forgotten route is protected by default. The session is a signed cookie with no server-side store, so logout clears the cookie but cannot revoke a stolen one; for a single-owner shop this is accepted and noted under next steps.

## 9. Report dates and the shop timezone

Reports place a sale or count on the shop day it was **executed**, in Asia/Tashkent (UTC+5); manual cash entries use the date the owner gave. The reasoning is in [ADR 0001](adr/0001-report-dates-and-shop-timezone.md).

## 10. Why there is no Redis or BullMQ

The job post lists Redis/BullMQ, but nothing in this scope is asynchronous. Execution is a single database transaction that should finish before the owner sees "done"; reports are queries; there are no emails, imports or schedules. Adding a queue would add a second piece of infrastructure to run, monitor and deploy for no behaviour. If imports, notifications or bulk recalculation are added, a queue is the right tool then.

## 11. Testing strategy

- **Main seam: the HTTP API.** Tests build the real Fastify app in-process and call it with `inject`, against a throwaway in-memory MongoDB replica set (no Docker needed), so real transactions run. They seed through the API and assert through the report endpoints, on what the owner would see: balances, stock by warehouse, cash, profit, and errors. They do not look inside collections, so internals can be refactored freely.
- **Second seam: pure domain arithmetic.** Table-driven unit tests for unit conversion, the moving average, the stock-count difference, the cash-category rules and P&L composition.
- **Architecture test** for the layer boundaries (section 7).
- **Seed test**: the demo seed is built through the use cases and a test checks that every report has data.
- The web app is verified manually against the live demo; there is no UI test automation within the time budget.

Run everything with `pnpm typecheck` and `pnpm test`.

## 12. Out of scope and next steps

Not built, in the order I would add them:

1. **Reversals.** Executed documents are immutable. A mistake needs a correcting document; a proper reversal should append opposite movements and a reversing cash entry, never edit history. The ledger design supports it.
2. **Transfers between warehouses.** Two movements in one transaction; it reuses the ledger.
3. **Credit sales and purchases.** Today every sale and purchase is paid in full at once. Customer and supplier receivables and payables would reuse the counterparty model.
4. **Users and roles.** One owner only today. Add a users collection and per-route permissions; the public-by-opt-out guard is already in place.
5. **Server-side sessions** so logout can revoke a session.
6. FIFO/batch costing and expiry dates; several pack sizes per product; multiple cash registers or currencies; printing and barcode scanning.

Known small gaps: the stock-at endpoint returns an empty list rather than 404 for an unknown warehouse; the seed's document numbers follow creation order rather than document date.
