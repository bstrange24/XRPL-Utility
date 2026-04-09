import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowUtilService } from './escrow-util.service';
import { EscrowStoreService } from '../escrow-store/escrow-store.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import * as xrpl from 'xrpl';

describe('EscrowUtilService', () => {
     let service: EscrowUtilService;
     let escrowStore: InstanceType<typeof EscrowStoreService>;

     const mockUtils = {
          normalizeCurrencyCode: jasmine.createSpy('normalizeCurrencyCode').and.callFake((c: string) => c),
          formatIOUXrpAmountOutstanding: jasmine.createSpy('formatIOUXrpAmountOutstanding').and.returnValue('1 XRP'),
          encodeIfNeeded: jasmine.createSpy('encodeIfNeeded').and.callFake((v: string) => v),
          logObjects: jasmine.createSpy('logObjects'),
     };

     const mockCurrencyStore = {
          currencyCode: signal('XRP'),
          currencyIssuer: signal(''),
          setField: jasmine.createSpy('setField'),
     };

     const mockWalletManager = {
          getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(null),
          wallets: signal([]),
     };

     const mockTxUiService = {
          explorerUrl: signal(''),
          currentStep: signal('idle'),
          stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
     };

     const mockXrplDateService = {
          rippleToISO: jasmine.createSpy('rippleToISO').and.callFake((t: number) => new Date((t + 946684800) * 1000).toISOString()),
          isExpired: jasmine.createSpy('isExpired').and.returnValue(false),
     };

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [
                    EscrowUtilService,
                    EscrowStoreService,
                    { provide: UtilsService, useValue: mockUtils },
                    { provide: CurrencyStoreService, useValue: mockCurrencyStore },
                    { provide: WalletManagerService, useValue: mockWalletManager },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplDateService, useValue: mockXrplDateService },
                    { provide: XrplCacheService, useValue: { getTxCached: jasmine.createSpy().and.resolveTo({ result: { tx_json: { Sequence: 1 } } }) } },
                    { provide: TrustlineCurrencyService, useValue: { currencyItems: signal([]), issuerItems: signal([]) } },
                    { provide: XrplTransactionService, useValue: {} },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: ToastService, useValue: {} },
               ],
          });
          service = TestBed.inject(EscrowUtilService);
          escrowStore = TestBed.inject(EscrowStoreService);
          escrowStore.resetAll();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('escrowItems', () => {
          const escrows = [
               { EscrowSequence: 1, Sender: 'rALICE', Destination: 'rBOB', Amount: '1000000' },
               { EscrowSequence: 2, Sender: 'rBOB', Destination: 'rALICE', Amount: '2000000' },
               { EscrowSequence: 3, Sender: 'rALICE', Destination: 'rCHARLIE', Amount: '3000000' },
          ];

          it('should filter by Sender when isCancel=true', () => {
               const items = service.escrowItems(escrows, 'rALICE', true);
               expect(items.length).toBe(2);
               expect(items.map(i => i.id)).toContain('1');
               expect(items.map(i => i.id)).toContain('3');
          });

          it('should filter by Destination when isCancel=false', () => {
               const items = service.escrowItems(escrows, 'rBOB', false);
               expect(items.length).toBe(1);
               expect(items[0].id).toBe('1');
          });

          it('should map to EscrowDropdownItem with id, display, secondary', () => {
               const items = service.escrowItems(escrows, 'rALICE', true);
               expect(items[0].id).toBeDefined();
               expect(items[0].display).toBeDefined();
               expect(items[0].secondary).toBeDefined();
          });

          it('should return empty array when no matching escrows', () => {
               const items = service.escrowItems(escrows, 'rUNKNOWN', true);
               expect(items).toEqual([]);
          });
     });

     describe('selectedEscrowItem', () => {
          const items = [
               { id: '10', display: 'Escrow 10', secondary: 'Seq: 10' },
               { id: '20', display: 'Escrow 20', secondary: 'Seq: 20' },
          ];

          it('should find item by id matching sequenceNumber', () => {
               const found = service.selectedEscrowItem(items, '10');
               expect(found).toEqual(items[0]);
          });

          it('should return null when sequenceNumber is empty', () => {
               expect(service.selectedEscrowItem(items, '')).toBeNull();
          });

          it('should return null when no match', () => {
               expect(service.selectedEscrowItem(items, '999')).toBeNull();
          });

          it('should coerce numeric sequenceNumber to string', () => {
               const found = service.selectedEscrowItem(items, 20 as any);
               expect(found).toEqual(items[1]);
          });
     });

     describe('isEscrowExpired', () => {
          it('should return false when cancelAfter is undefined', () => {
               expect(service.isEscrowExpired(undefined, undefined, 'finishEscrow')).toBeFalse();
          });

          it('should return false when cancelAfter is in the future', () => {
               // cancelAfter = very large ripple epoch time (far future)
               const futureRippleTime = Math.floor(Date.now() / 1000) - 946684800 + 100000;
               expect(service.isEscrowExpired(futureRippleTime, undefined, 'finishEscrow')).toBeFalse();
          });

          it('should return true when cancelAfter is in the past', () => {
               // cancelAfter = 1 (very old date in ripple time)
               expect(service.isEscrowExpired(1, undefined, 'finishEscrow')).toBeTrue();
          });
     });

     describe('checkEscrowStatus', () => {
          it('should return canFinish=false when no FinishAfter and no Condition', () => {
               const result = service.checkEscrowStatus({ CancelAfter: undefined, FinishAfter: undefined, Condition: undefined, owner: 'rALICE', escrowType: 'time' }, 100, 'rALICE');
               expect(result.canFinish).toBeFalse();
          });

          it('should return canCancel=false when no CancelAfter and escrowType is not finish', () => {
               const result = service.checkEscrowStatus({ CancelAfter: undefined, FinishAfter: 50, Condition: undefined, owner: 'rALICE', escrowType: 'time' }, 100, 'rALICE');
               expect(result.canCancel).toBeFalse();
          });

          it('should return canFinish=false when current time is before FinishAfter', () => {
               const result = service.checkEscrowStatus({ CancelAfter: undefined, FinishAfter: 500, Condition: undefined, owner: 'rALICE', escrowType: 'time' }, 100, 'rALICE');
               expect(result.canFinish).toBeFalse();
          });

          it('should return canCancel=false when caller is not the owner', () => {
               const result = service.checkEscrowStatus({ CancelAfter: 50, FinishAfter: undefined, Condition: undefined, owner: 'rALICE', escrowType: 'time' }, 100, 'rBOB');
               expect(result.canCancel).toBeFalse();
          });

          it('should return canFinish=true when time condition is met', () => {
               mockXrplDateService.isExpired.and.returnValue(false);
               const result = service.checkEscrowStatus({ CancelAfter: undefined, FinishAfter: 50, Condition: undefined, owner: 'rALICE', escrowType: 'time' }, 100, 'rALICE');
               expect(result.canFinish).toBeTrue();
          });
     });

     describe('validateEscrowCreate', () => {
          it('should return valid=false with errors when no finishAfter and no condition', () => {
               const result = service.validateEscrowCreate({ finishAfter: null, cancelAfter: null, condition: null, currentRippleTime: 100 });
               expect(result.valid).toBeFalse();
               expect(result.errors.length).toBeGreaterThan(0);
          });

          it('should return valid=true when finishAfter is in the future', () => {
               const result = service.validateEscrowCreate({ finishAfter: 500, cancelAfter: null, condition: null, currentRippleTime: 100 });
               expect(result.valid).toBeTrue();
               expect(result.errors.length).toBe(0);
          });

          it('should return error when finishAfter >= cancelAfter', () => {
               const result = service.validateEscrowCreate({ finishAfter: 200, cancelAfter: 100, condition: null, currentRippleTime: 50 });
               expect(result.valid).toBeFalse();
               expect(result.errors.some(e => e.includes('FinishAfter'))).toBeTrue();
          });

          it('should return error when finishAfter is in the past', () => {
               const result = service.validateEscrowCreate({ finishAfter: 50, cancelAfter: null, condition: null, currentRippleTime: 100 });
               expect(result.valid).toBeFalse();
          });
     });

     describe('validateTimeEscrowUI', () => {
          it('should return error when finishAfter is null', () => {
               const errors = service.validateTimeEscrowUI({ finishAfter: null, cancelAfter: null });
               expect(errors.length).toBeGreaterThan(0);
          });

          it('should return empty array when finishAfter is set', () => {
               const errors = service.validateTimeEscrowUI({ finishAfter: 500, cancelAfter: null });
               expect(errors).toEqual([]);
          });
     });

     describe('validateConditionalEscrowUI', () => {
          it('should return error message when condition is null', () => {
               const msg = service.validateConditionalEscrowUI({ finishAfter: null, cancelAfter: null, condition: null });
               expect(msg.length).toBeGreaterThan(0);
          });

          it('should return empty string when condition is set', () => {
               const msg = service.validateConditionalEscrowUI({ finishAfter: null, cancelAfter: null, condition: 'ABCDEF' });
               expect(msg).toBe('');
          });
     });

     describe('formatEscrowAmount', () => {
          it('should convert drops to XRP for string amount', () => {
               const result = service.formatEscrowAmount('1000000');
               expect(result).toContain('XRP');
          });

          it('should return value and MPT for MPT amount', () => {
               const result = service.formatEscrowAmount({ mpt_issuance_id: '001', value: '5' });
               expect(result).toContain('MPT');
               expect(result).toContain('5');
          });

          it('should return value and currency for IOU amount', () => {
               const result = service.formatEscrowAmount({ currency: 'USD', value: '10', issuer: 'rISSUER' });
               expect(result).toContain('10');
               expect(result).toContain('USD');
          });
     });

     describe('onEscrowSelected', () => {
          it('should set escrowSequenceNumber in store when item provided', () => {
               const item = { id: 'SEQ5', display: '1 XRP → rDEST rOWNER', secondary: 'Seq: 5', issuer: '' };
               service.onEscrowSelected(item);
               expect(escrowStore.escrowSequenceNumber()).toBe('SEQ5');
          });

          it('should not change store when item is null', () => {
               escrowStore.setField('escrowSequenceNumber', 'EXISTING');
               service.onEscrowSelected(null);
               expect(escrowStore.escrowSequenceNumber()).toBe('EXISTING');
          });
     });

     describe('onEscrowSelectedInUi', () => {
          it('should set escrowSequenceNumber when item provided', () => {
               const item = { id: 'SEQ10', amount: '5 XRP', sender: 'rSENDER' };
               service.onEscrowSelectedInUi(item);
               expect(escrowStore.escrowSequenceNumber()).toBe('SEQ10');
          });

          it('should not change store when item is null', () => {
               escrowStore.setField('escrowSequenceNumber', 'EXISTING2');
               service.onEscrowSelectedInUi(null);
               expect(escrowStore.escrowSequenceNumber()).toBe('EXISTING2');
          });
     });
});
