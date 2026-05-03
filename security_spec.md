# Security Specification - Chai Point Billing

## Data Invariants
1. All user-specific data must reside under a path starting with `/users/{userId}/`.
2. A user can only read and write their own data (`request.auth.uid == userId`).
3. Orders must have a valid `timestamp`, `total`, and at least one item.
4. Stock count cannot be negative (enforced by validation but critical for integrity).
5. Timestamps must be server-validated where possible (using `request.time` or matching provided numbers).

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Theft**: Accessing `/users/other-user/orders/123`.
2. **Shadow Field Injection**: Adding `isVerified: true` to a UserItem.
3. **Price Forgery**: Creating an order where `total` is negative.
4. **ID Poisoning**: Using a 2KB string as `orderId`.
5. **Timeline Warp**: Creating an order with a timestamp from the future.
6. **Stock Drain**: Setting `stock.count` to -1,000,000.
7. **Phantom Items**: Creating a draft bill with `items: ["not-an-object"]`.
8. **Summary Tamper**: Updating a past `DailySummary` to change sales figures.
9. **Role Escalation**: Attempting to write to `/admins/` (if it existed).
10. **Data Scraping**: Attempting to list all users' orders.
11. **Type Mismatch**: Sending a string for `Order.total`.
12. **Incomplete Order**: Creating an order without the `items` array.

## Test Runner (TDD)
(Wait for implementation of rules to run tests)
