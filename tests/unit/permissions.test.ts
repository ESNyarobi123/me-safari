import { describe, expect, it } from '@jest/globals';
import {
  permissions,
  rolePermissions,
  roles,
  type Role,
} from '../../packages/backend/src/permissions.js';
import {
  allowed,
  customer,
  staff,
  type Actor,
} from '../../packages/backend/src/core.js';

describe('RBAC permissions and role isolation invariants', () => {
  it('AUTH-01: verifies Customer role cannot hold administrative or operational write permissions', () => {
    const customerPerms = rolePermissions.CUSTOMER;
    expect(customerPerms).toContain('catalog.read');
    expect(customerPerms).toContain('booking.create_own');
    expect(customerPerms).toContain('booking.read');
    expect(customerPerms).toContain('quote.accept_own');
    expect(customerPerms).toContain('trip.read');

    // Forbidden for customer
    expect(customerPerms).not.toContain('booking.confirm');
    expect(customerPerms).not.toContain('booking.confirm_override');
    expect(customerPerms).not.toContain('assignment.manage');
    expect(customerPerms).not.toContain('finance.offline_record');
    expect(customerPerms).not.toContain('finance.offline_verify');
    expect(customerPerms).not.toContain('finance.adjustment');
    expect(customerPerms).not.toContain('refund.approve');
    expect(customerPerms).not.toContain('access.manage');
    expect(customerPerms).not.toContain('settings.manage');
  });

  it('SCOPE-03 & SCOPE-04: Guide has no finance permissions; Operations has operational permissions but no ungranted finance adjustments', () => {
    const guidePerms = rolePermissions.DRIVER_GUIDE;
    expect(guidePerms).toContain('trip.read');
    expect(guidePerms).toContain('trip.update_assigned');
    expect(guidePerms).toContain('issue.report_assigned');
    expect(guidePerms).not.toContain('finance.read');
    expect(guidePerms).not.toContain('report.finance');
    expect(guidePerms).not.toContain('payment.read_own');

    const opsPerms = rolePermissions.OPERATIONS;
    expect(opsPerms).toContain('booking.confirm');
    expect(opsPerms).toContain('assignment.manage');
    expect(opsPerms).toContain('itinerary.manage');
    expect(opsPerms).toContain('report.operations');
    // Offline verification and adjustments require explicit Admin or restricted grants
    expect(opsPerms).not.toContain('finance.offline_record');
    expect(opsPerms).not.toContain('finance.offline_verify');
    expect(opsPerms).not.toContain('finance.adjustment');
    expect(opsPerms).not.toContain('refund.approve');
    expect(opsPerms).not.toContain('access.manage');
  });

  it('ADMIN holds all registered permissions', () => {
    for (const p of permissions) {
      expect(rolePermissions.ADMIN).toContain(p);
    }
  });

  it('allowed() guard enforces action permission', () => {
    const customerActor: Actor = {
      id: 'user-c',
      sessionId: 'sess-c',
      role: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [...rolePermissions.CUSTOMER],
      customerId: 'cust-c',
      emailVerified: true,
      requestId: 'req-1',
    };

    expect(() => allowed(customerActor, 'booking.create_own')).not.toThrow();
    expect(() => allowed(customerActor, 'booking.confirm')).toThrow();
    expect(() => allowed(customerActor, 'access.manage')).toThrow();

    const opsActor: Actor = {
      id: 'user-ops',
      sessionId: 'sess-ops',
      role: 'OPERATIONS',
      roles: ['OPERATIONS'],
      permissions: [...rolePermissions.OPERATIONS],
      emailVerified: true,
      requestId: 'req-2',
    };
    expect(() => allowed(opsActor, 'booking.confirm')).not.toThrow();
    expect(() => allowed(opsActor, 'assignment.manage')).not.toThrow();
    expect(() => allowed(opsActor, 'refund.approve')).toThrow();
  });

  it('customer() guard enforces customer context and email verification', () => {
    const unverifiedCustomer: Actor = {
      id: 'user-u',
      sessionId: 'sess-u',
      role: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [...rolePermissions.CUSTOMER],
      customerId: 'cust-u',
      emailVerified: false,
      requestId: 'req-3',
    };
    expect(customer(unverifiedCustomer, false)).toBe('cust-u');
    expect(() => customer(unverifiedCustomer, true)).toThrow(); // throws EMAIL_VERIFICATION_REQUIRED

    const adminActor: Actor = {
      id: 'user-a',
      sessionId: 'sess-a',
      role: 'ADMIN',
      roles: ['ADMIN'],
      permissions: [...rolePermissions.ADMIN],
      emailVerified: true,
      requestId: 'req-4',
    };
    expect(() => customer(adminActor)).toThrow();
    expect(staff(adminActor)).toBe(true);
  });
});
