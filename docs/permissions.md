# Permissions and Access Control Specification

**Product:** Me and Adventure Safaris (M&A Safaris)  
**Security Model:** Named Permission Registry with Role Defaults, Dynamic Overrides, Row-Level Scoping, and Field Projections.

---

## 1. Registered Permission Actions

The permission registry defines atomic business actions enforced across the API and domain layers:

```typescript
export const ALL_PERMISSIONS = [
  // Catalog & Content
  'catalog.read', 'catalog.manage', 'content.publish',
  // Customers & CRM
  'customer.read', 'customer.manage', 'inquiry.manage',
  // Bookings & Itineraries
  'booking.create_own', 'booking.create_for_customer', 'booking.read',
  'booking.confirm', 'booking.change_review', 'booking.cancel_review',
  'booking.confirm_override', 'itinerary.manage',
  // Quotations
  'quote.manage', 'quote.accept_own',
  // Operations & Trips
  'assignment.manage', 'trip.read', 'trip.update_assigned',
  'issue.report_assigned', 'issue.manage', 'fleet.manage', 'staff.manage',
  // Finance & Payments
  'payment.read_own', 'finance.read', 'finance.offline_record',
  'finance.offline_verify', 'finance.adjustment',
  'refund.request', 'refund.approve',
  // Reports, Governance & Audit
  'report.operations', 'report.finance', 'access.manage', 'settings.manage', 'audit.read',
  // Identity & Support
  'identity.email_change', 'support.manage',
] as const;
```

---

## 2. Role Defaults

| Role | Granted Permissions |
|---|---|
| **CUSTOMER** | `catalog.read`, `booking.create_own`, `booking.read`, `quote.accept_own`, `payment.read_own` |
| **OPERATIONS** | `catalog.read`, `customer.read`, `customer.manage`, `inquiry.manage`, `booking.create_for_customer`, `booking.read`, `booking.confirm`, `booking.change_review`, `booking.cancel_review`, `itinerary.manage`, `quote.manage`, `assignment.manage`, `trip.read`, `issue.manage`, `report.operations`, `support.manage` |
| **DRIVER_GUIDE**| `catalog.read`, `trip.read`, `trip.update_assigned`, `issue.report_assigned` |
| **ADMIN** | *All permissions granted by default* |

---

## 3. Row-Scoping and Field Projection Rules

1. **Customer Isolation:**
   - Any access to `/bookings/:id`, `/quotes/:id`, `/payment-intents/:id`, or `/documents/:id` evaluates `customerId = actor.customerId`. If the resource belongs to another customer, the server returns `404 NOT_FOUND` to prevent identity enumeration.
2. **Guide Trip Projection:**
   - Guides can only view trips where they are the currently active assigned guide (`assignments.some(a => a.guideId === actor.guideId && a.endedAt === null)`).
   - Responses strip all booking prices, deposit amounts, payment totals, customer billing histories, and internal staff notes.
3. **Internal vs Customer Visibility:**
   - Internal CRM notes, supplier cost fields (`internalCostMinor`, `supplierCosts`), and private trip incident deliberations are completely omitted from customer and guide serialization.
4. **Action-Scoped Reauthentication:**
   - High-impact operations (`booking.confirm_override`, `access.manage`, `refund.approve`, `finance.adjustment`, `identity.email_change`) require a recent action-scoped reauthentication token passed via the `X-Reauthentication-Token` header.
5. **Last Administrator Safeguard:**
   - Revoking the `ADMIN` role or suspending an administrator user is blocked at the database transaction level if only one active administrator remains in the system.
