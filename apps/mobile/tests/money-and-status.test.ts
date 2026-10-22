import {amount,nextStage} from '../src/lib/domain';
import {translate} from '../src/lib/i18n';
test('displayed money respects zero and three digit currency exponents',()=>{expect(amount('1250','JPY')).not.toMatch(/12[.,]50/);expect(amount('1250','KWD')).toMatch(/1[.,]250/);expect(amount('101250','USD')).toMatch(/1,012[.]50/);});
test('native progress presents only the next stage and completion has no successor',()=>{expect(nextStage('SCHEDULED')).toBe('EN_ROUTE_TO_PICKUP');expect(nextStage('RETURNING')).toBe('COMPLETED');expect(nextStage('COMPLETED')).toBeUndefined();expect(nextStage('CANCELLED')).toBeUndefined();});
test('the shared controls translate to Kiswahili',()=>{expect(translate('Sign in','sw')).toBe('Ingia');expect(translate('Payments','sw')).toBe('Malipo');});
