import { TestBed } from '@angular/core/testing';
import { ValidationService, ValidationContext } from './transaction-validation-rule.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';

// Minimal stub implementations
class XrplServiceStub {
     getAccountInfo = jasmine.createSpy('getAccountInfo').and.resolveTo({ result: { account_flags: {} } });
}
class UtilsServiceStub {
     detectXrpInputType = jasmine.createSpy('detectXrpInputType').and.returnValue({ type: 'familySeed', value: 'valid' });
     validateInput = jasmine.createSpy('validateInput').and.returnValue(true);
     getMultiSignAddress = jasmine.createSpy('getMultiSignAddress').and.callFake((s: string) =>
          s
               .split(',')
               .map(x => x.trim())
               .filter(Boolean)
     );
     getMultiSignSeeds = jasmine.createSpy('getMultiSignSeeds').and.callFake((s: string) =>
          s
               .split(',')
               .map(x => x.trim())
               .filter(Boolean)
     );
     isValidCurrencyCode = jasmine.createSpy('isValidCurrencyCode').and.returnValue(true);
     validateAndConvertDidJson = jasmine.createSpy('validateAndConvertDidJson').and.returnValue({ success: true });
     isValidEmail = jasmine.createSpy('isValidEmail').and.returnValue(true);
}
class TransactionUiServiceStub {
     tickSize = jasmine.createSpy('tickSize').and.returnValue(undefined as any);
     transferRate = jasmine.createSpy('transferRate').and.returnValue(undefined as any);
     userEmail = jasmine.createSpy('userEmail').and.returnValue(undefined as any);
     regularKeyAddress = jasmine.createSpy('regularKeyAddress').and.returnValue('');
     regularKeySeed = jasmine.createSpy('regularKeySeed').and.returnValue('');
}

describe('ValidationService', () => {
     let service: ValidationService;
     let xrplService: XrplServiceStub;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [ValidationService, { provide: XrplService, useClass: XrplServiceStub }, { provide: UtilsService, useClass: UtilsServiceStub }, { provide: TransactionUiService, useClass: TransactionUiServiceStub }],
          });

          service = TestBed.inject(ValidationService);
          xrplService = TestBed.inject(XrplService) as unknown as XrplServiceStub;
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     function baseCtx(overrides: Partial<ValidationContext> = {}): ValidationContext {
          return {
               inputs: {},
               accountInfo: { result: { account_data: { Sequence: 1 }, account_flags: { disableMasterKey: false } } },
               currentLedger: 10000,
               ...overrides,
          } as ValidationContext;
     }

     it('should report required field errors for nested PaymentXrp inputs', async () => {
          const ctx = baseCtx({
               inputs: {
                    wallet: { seed: '' },
                    paymentXrp: { amount: '', destination: '' },
               },
          });

          const errors = await service.validate('PaymentXrp', ctx);

          // Expect errors for required fields with capitalized leaf names
          expect(errors).toContain('Seed is required');
          expect(errors).toContain('Amount is required');
          expect(errors).toContain('Destination is required');
     });

     it('should validate destination address and return Invalid XRP Address when invalid', async () => {
          const ctx = baseCtx({
               inputs: {
                    wallet: { seed: 'sValidSeed' },
                    paymentXrp: { amount: '10', destination: 'not-an-address' },
               },
          });

          const errors = await service.validate('PaymentXrp', ctx);
          expect(errors).toContain('Invalid XRP Address');
     });

     it('should enforce positive amount for PaymentXrp', async () => {
          const ctxZero = baseCtx({ inputs: { wallet: { seed: 'sValidSeed' }, paymentXrp: { amount: '0', destination: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1' } } });
          const errZero = await service.validate('PaymentXrp', ctxZero);
          expect(errZero).toContain('Amount must be greater than 0');

          const ctxNeg = baseCtx({ inputs: { wallet: { seed: 'sValidSeed' }, paymentXrp: { amount: '-5', destination: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1' } } });
          const errNeg = await service.validate('PaymentXrp', ctxNeg);
          expect(errNeg).toContain('Amount must be greater than 0');
     });

     it('should require alt signing when master key is disabled and no regular/multisign selected', async () => {
          const ctx = baseCtx({
               inputs: {
                    wallet: { seed: 'sValidSeed' },
                    paymentXrp: { amount: '10', destination: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1' },
                    isRegularKey: { isRegularKey: false },
                    multiSign: { enabled: false },
               },
               accountInfo: { result: { account_data: { Sequence: 1 }, account_flags: { disableMasterKey: true } } },
          });

          const errors = await service.validate('PaymentXrp', ctx);
          expect(errors).toContain('Master key is disabled. Must sign with Regular Key or Multi-sign.');
     });

     it('should validate destination/source tag range and messages', async () => {
          // Valid tags should not error
          const okCtx = baseCtx({
               inputs: {
                    wallet: { seed: 'sValidSeed' },
                    paymentXrp: { amount: '10', destination: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1', destinationTag: '123', sourceTag: '0' },
               },
          });
          const okErrors = await service.validate('PaymentXrp', okCtx);
          // Ensure no tag-related errors (other validators may still trigger, but these should not)
          expect(okErrors.find(e => e.includes('Destination Tag'))).toBeUndefined();
          expect(okErrors.find(e => e.includes('Source Tag'))).toBeUndefined();

          // Invalid destinationTag (out of range)
          const badDestTag = baseCtx({
               inputs: {
                    wallet: { seed: 'sValidSeed' },
                    paymentXrp: { amount: '10', destination: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1', destinationTag: '4294967296' },
               },
          });
          const destTagErrors = await service.validate('PaymentXrp', badDestTag);
          expect(destTagErrors).toContain('Destination Tag must be an integer between 0 and 4294967295');

          // Invalid sourceTag (non-integer negative)
          const badSourceTag = baseCtx({
               inputs: {
                    wallet: { seed: 'sValidSeed' },
                    paymentXrp: { amount: '10', destination: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1', sourceTag: '-1' },
               },
          });
          const sourceTagErrors = await service.validate('PaymentXrp', badSourceTag);
          expect(sourceTagErrors).toContain('Source Tag must be an integer between 0 and 4294967295');
     });
});
