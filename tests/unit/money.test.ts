import { describe, expect, it } from '@jest/globals';
import {
  ceilBasisPoints,
  currencyExponents,
  escapeCsv,
  financialSummary,
  minor,
  serialize,
  supportedCurrency,
} from '../../packages/backend/src/money.js';

describe('money, rounding and serialization invariants', () => {
  it('PRICE-01: exactly computes USD 3,375 total and USD 1,012.50 deposit using minor units', () => {
    // 2 adults at 1,250.00 = 2,500.00 (250000 minor)
    // 1 child at 875.00 = 875.00 (87500 minor)
    // total = 3,375.00 (337500 minor)
    const adultMinor = minor('125000');
    const childMinor = minor('87500');
    const totalMinor = adultMinor * 2n + childMinor;
    expect(totalMinor).toBe(337500n);

    // 30% deposit = 3000 basis points
    const depositMinor = ceilBasisPoints(totalMinor, 3000);
    expect(depositMinor).toBe(101250n);

    const summary = financialSummary(totalMinor, depositMinor, [], [], [], 'USD');
    expect(summary.contractTotal).toBe(337500n);
    expect(summary.depositTarget).toBe(101250n);
    expect(summary.depositDue).toBe(101250n);
    expect(summary.balanceDue).toBe(337500n);
    expect(summary.netPaid).toBe(0n);
    expect(summary.status).toBe('UNPAID');
  });

  it('rejects invalid, negative or float minor unit strings', () => {
    expect(() => minor('-100')).toThrow();
    expect(() => minor('10.50')).toThrow();
    expect(() => minor('abc')).toThrow();
    expect(minor('10000')).toBe(10000n);
    expect(minor(2500n)).toBe(2500n);
  });

  it('validates supported currencies and rejects unsupported ones', () => {
    expect(supportedCurrency('USD')).toBe('USD');
    expect(supportedCurrency('TZS')).toBe('TZS');
    expect(supportedCurrency('EUR')).toBe('EUR');
    expect(supportedCurrency('GBP')).toBe('GBP');
    expect(supportedCurrency('JPY')).toBe('JPY');
    expect(supportedCurrency('KWD')).toBe('KWD');
    expect(() => supportedCurrency('XYZ')).toThrow();
    expect(currencyExponents.USD).toBe(2);
    expect(currencyExponents.JPY).toBe(0);
    expect(currencyExponents.KWD).toBe(3);
  });

  it('reconciles deposit payment, remaining balance, and overpayment refunds', () => {
    const total = 337500n;
    const deposit = 101250n;

    // After paying deposit:
    const afterDeposit = financialSummary(
      total,
      deposit,
      [],
      [{ amountMinor: 101250n }],
      [],
      'USD',
    );
    expect(afterDeposit.capturedTotal).toBe(101250n);
    expect(afterDeposit.netPaid).toBe(101250n);
    expect(afterDeposit.depositDue).toBe(0n);
    expect(afterDeposit.balanceDue).toBe(236250n);
    expect(afterDeposit.status).toBe('PARTIALLY_PAID');

    // After paying remaining balance:
    const afterFull = financialSummary(
      total,
      deposit,
      [],
      [{ amountMinor: 101250n }, { amountMinor: 236250n }],
      [],
      'USD',
    );
    expect(afterFull.capturedTotal).toBe(337500n);
    expect(afterFull.netPaid).toBe(337500n);
    expect(afterFull.balanceDue).toBe(0n);
    expect(afterFull.refundDue).toBe(0n);
    expect(afterFull.status).toBe('PAID');

    // After cancellation with 50% credit retention:
    // contract total adjusted from 337500 down to 100000 (credit adjustment of 237500)
    const afterCredit = financialSummary(
      total,
      deposit,
      [{ amountMinor: 237500n, direction: 'CREDIT' }],
      [{ amountMinor: 337500n }],
      [],
      'USD',
    );
    expect(afterCredit.contractTotal).toBe(100000n);
    expect(afterCredit.netPaid).toBe(337500n);
    expect(afterCredit.refundDue).toBe(237500n);
    expect(afterCredit.status).toBe('REFUND_DUE');

    // After refund settlement of 237500:
    const afterRefundSettled = financialSummary(
      total,
      deposit,
      [{ amountMinor: 237500n, direction: 'CREDIT' }],
      [{ amountMinor: 337500n }],
      [{ amountMinor: 237500n }],
      'USD',
    );
    expect(afterRefundSettled.contractTotal).toBe(100000n);
    expect(afterRefundSettled.refundedTotal).toBe(237500n);
    expect(afterRefundSettled.netPaid).toBe(100000n);
    expect(afterRefundSettled.refundDue).toBe(0n);
    expect(afterRefundSettled.balanceDue).toBe(0n);
    expect(afterRefundSettled.status).toBe('PAID');
  });

  it('REPORT-02: escapes CSV cells starting with formula characters to prevent injection', () => {
    expect(escapeCsv('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
    expect(escapeCsv('+cmd|calc')).toBe('"\' +cmd|calc"'.replace(' ', ''));
    expect(escapeCsv('-100')).toBe('"\' -100"'.replace(' ', ''));
    expect(escapeCsv('@admin')).toBe('"\' @admin"'.replace(' ', ''));
    expect(escapeCsv('Normal text')).toBe('"Normal text"');
    expect(escapeCsv('Contains "quotes"')).toBe('"Contains ""quotes"""');
  });

  it('serializes BigInt values into strings across nested structures without throwing', () => {
    const raw = {
      id: 'uuid-123',
      amountMinor: 50000n,
      nested: { balanceMinor: 25000n, count: 5 },
      list: [100n, 200n],
    };
    const serialized = serialize(raw);
    expect(serialized).toEqual({
      id: 'uuid-123',
      amountMinor: '50000',
      nested: { balanceMinor: '25000', count: 5 },
      list: ['100', '200'],
    });
  });
});
