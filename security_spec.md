# Firestore Security Specification

## Data Invariants
1. A trip must have a valid riderId and driverId (once accepted).
2. A message can only be sent by a participant (rider or driver) of the trip.
3. A user can only update their own profile, except for ratings and earnings which might be updated by the system (in this architecture, we allow certain updates by the driver/rider during trip completion).
4. Trip status transitions must follow: `requested` -> `accepted` -> `ongoing` -> `completed` (or `cancelled`).

## The "Dirty Dozen" Payloads

1. **Spoofing Identity on Profile Creation**: User A creates a profile for User B.
2. **Elevating Privilege on Profile Creation**: User sets `role: 'admin'` or `earnings: 1000000`.
3. **Ghost Write to Trip**: Non-participant writes to a trip document.
4. **Illegal Status Transition**: Moving a trip from `requested` to `completed` directly.
5. **Shadow Field Injection**: Adding `isVerified: true` to a user profile.
6. **Message Impersonation**: User A sends a message to Trip X with `senderId: B`.
7. **Orphaned Message**: Sending a message to a non-existent Trip.
8. **Resource Poisoning (ID)**: Creating a trip with a 2KB string as `tripId`.
9. **Resource Poisoning (Value)**: Sending a message with a 1MB text string.
10. **Bypassing Query Security**: Querying all trips where `status == 'requested'` without being a driver (though this specifically is intended for drivers to see available requests, but riders shouldn't see it).
11. **Updating Immutable Fields**: Changing the `riderId` of an existing trip.
12. **Self-Rating Hack**: User ratings themselves with 5 stars and bypass validation.

## The Test Runner (Mock Tests)
These tests ensure that the above payloads are rejected by PERMISSION_DENIED.

```typescript
// firestore.rules.test.ts
// (Note: This is a conceptual test runner for the plan)
describe('Firestore Security Rules', () => {
  it('should deny unauthorized user profile creation', async () => { ... });
  it('should deny elevated role assignment by user', async () => { ... });
  it('should deny non-participants from reading trip messages', async () => { ... });
  it('should deny illegal trip status transitions', async () => { ... });
  it('should deny shadow field injection', async () => { ... });
  it('should deny message impersonation', async () => { ... });
  it('should deny extremely large string values', async () => { ... });
});
```
