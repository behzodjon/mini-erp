# Report dates and the shop timezone

## Decision

- The shop's calendar is **Asia/Tashkent (UTC+5, no DST)**, defined once as `SHOP_TIME_ZONE` / `SHOP_UTC_OFFSET_HOURS` in `@erp/shared`. A report range `from`–`to` covers whole shop days, both ends included.
- Reports place a document on the day it was **executed**, never on its document date or its draft time: sales (and so revenue and cost of goods sold) and stock counts.
- **Cash entries have no execution step**, so P&L places operating expenses and other income on the entry's own `date`. A backdated entry lands on the day the owner gave it.
- The cash balance in Cash & debts is the sum of **all** entries, including any dated in the future; it is the money the system says the shop holds now.

## Why

A sale's revenue and cost are only known when stock leaves, so the execution time is the honest date. A manual cash entry is the owner's own statement about a day, so its date is the one that matters. A fixed UTC+5 is simple and correct for Uzbekistan; if the shop ever moves, change the constant.
