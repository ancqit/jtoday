# Agent brief: PR for `feature/shared-shop-orders`

Use this file to open a pull request for **junction.today** checkout → shared `orders` on junctionBack.

## Repo facts

| Field | Value |
| --- | --- |
| GitHub | `ancqit/jtoday` |
| Branch | `feature/shared-shop-orders` |
| Base | `main` |
| Remote | `origin` (`https://github.com/ancqit/jtoday.git`) |
| Companion PRs required first | **junctionBack** `feature/shared-shop-orders` (session JWT `POST /orders`) must be merged and deployed to Render before this is useful in production |

## What this branch does

- Checkout creates orders via `POST /orders` using a **junction.today session JWT** (not a public unauthenticated call).
- Payload includes `source: "junction.today"` and COD billing (`payment_method: cash`, `payment_status: pending`).
- Customer phone is normalized to E.164 where needed.
- Session interceptor treats `/orders` as a session-protected path.

### Files changed

- `junction-web/src/app/core/orders.api.ts`
- `junction-web/src/app/services/orders.service.ts`
- `junction-web/src/app/core/session.interceptor.ts`

## Deploy order

1. Merge + deploy **junctionBack** shared-orders branch.
2. Merge this PR (jtoday).
3. Merge **junctionFrontweb** shared-orders PR (owner Orders inbox).

## Create the PR (copy-paste)

From this repo root on `feature/shared-shop-orders`:

```powershell
git push -u origin HEAD

gh pr create --base main --head feature/shared-shop-orders --title "Shared shop orders: checkout posts with session JWT" --body "$( @'
## Summary
- Place marketplace checkout orders through junctionBack `POST /orders` with a junction.today session JWT.
- Tag orders with `source: junction.today` so Front Web owners can see customer orders for the same `store_id`.
- Keep COD v1 (`cash` / `pending`); no customer Razorpay in this PR.

## Depends on
- [ ] junctionBack PR for `feature/shared-shop-orders` merged and live on Render (guest/session create + owner PATCH).

## Companion
- junctionFrontweb `feature/shared-shop-orders` — Orders inbox Confirm/Complete/Cancel + poll.

## Test plan
- [ ] Deploy backend shared-orders first.
- [ ] On junction.today: open a Front Web shop, add product(s), checkout with name + phone.
- [ ] Confirm API returns `order_number` and UI shows success.
- [ ] In Front Web Orders for that shop, the same `order_number` appears (after Front Web PR is live).
- [ ] Without backend deploy, expect 401/403 on `POST /orders` from Today — that is expected.

## Notes for reviewers
- Session token from `POST /session` must be sent as `Authorization: Bearer`.
- `store_id` must be the shop Mongo id from catalog APIs.
'@ )"
```

## Suggested PR title

`Shared shop orders: checkout posts with session JWT`

## Do not

- Do not force-push `main`.
- Do not merge this before junctionBack supports session `POST /orders`.
- Do not remove `source: "junction.today"` — owners use it in the inbox.
