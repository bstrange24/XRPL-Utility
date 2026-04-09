import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CheckUtilService } from './check-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { ChecksStoreService } from '../checks-store/checks-store.service';
import * as xrpl from 'xrpl';

describe('CheckUtilService', () => {
     let service: CheckUtilService;
     let checksStore: InstanceType<typeof ChecksStoreService>;

     const makeAccountObjects = (objs: any[]): xrpl.AccountObjectsResponse => ({ result: { account_objects: objs } }) as any;

     const xrpCheck = (account: string, destination: string, index: string, drops = '1000000') => ({
          LedgerEntryType: 'Check',
          Account: account,
          Destination: destination,
          index,
          SendMax: drops,
     });

     const iouCheck = (account: string, destination: string, index: string, value = '10', currency = 'USD', issuer = 'rISSUER') => ({
          LedgerEntryType: 'Check',
          Account: account,
          Destination: destination,
          index,
          SendMax: { value, currency, issuer },
     });

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

     const mockTxOptionsStore = {
          setField: jasmine.createSpy('setField'),
     };

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [
                    CheckUtilService,
                    ChecksStoreService,
                    { provide: UtilsService, useValue: mockUtils },
                    { provide: WalletManagerService, useValue: { getSelectedWallet: () => null, wallets: signal([]) } },
                    { provide: TransactionUiService, useValue: { explorerUrl: signal(''), currentStep: signal('idle'), stepMessage: () => '' } },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: ToastService, useValue: {} },
                    { provide: XrplTransactionService, useValue: {} },
                    { provide: TrustlineCurrencyService, useValue: { currencyItems: signal([]), issuerItems: signal([]) } },
                    { provide: XrplDateService, useValue: {} },
                    { provide: XrplTxOptionsStore, useValue: mockTxOptionsStore },
                    { provide: CurrencyStoreService, useValue: mockCurrencyStore },
                    { provide: TrustlineStoreService, useValue: { outstandingIOUCollapsed: signal(false) } },
               ],
          });
          service = TestBed.inject(CheckUtilService);
          checksStore = TestBed.inject(ChecksStoreService);
          checksStore.resetAll();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('getExistingChecks', () => {
          it('should return only checks owned by classicAddress', () => {
               const objs = makeAccountObjects([xrpCheck('rOWNER', 'rDEST1', 'IDX1'), xrpCheck('rOTHER', 'rDEST2', 'IDX2')]);
               const result = service.getExistingChecks(objs, 'rOWNER');
               expect(result.length).toBe(1);
               expect(result[0].id).toBe('IDX1');
          });

          it('should convert XRP drops to XRP for existing checks', () => {
               const objs = makeAccountObjects([xrpCheck('rOWNER', 'rDEST', 'IDX1', '1000000')]);
               const result = service.getExistingChecks(objs, 'rOWNER');
               expect(result[0].amount).toContain('1');
          });

          it('should handle IOU sendMax for existing checks', () => {
               const objs = makeAccountObjects([iouCheck('rOWNER', 'rDEST', 'IDX1', '50', 'USD', 'rISSUER')]);
               const result = service.getExistingChecks(objs, 'rOWNER');
               expect(result[0].amount).toContain('50');
          });

          it('should return empty array when no matching checks', () => {
               const objs = makeAccountObjects([xrpCheck('rOTHER', 'rDEST', 'IDX1')]);
               expect(service.getExistingChecks(objs, 'rNONE')).toEqual([]);
          });
     });

     describe('getCashableChecks', () => {
          it('should return only checks destined to classicAddress', () => {
               const objs = makeAccountObjects([xrpCheck('rSENDER', 'rMYADDR', 'IDX1'), xrpCheck('rSENDER2', 'rOTHER', 'IDX2')]);
               const result = service.getCashableChecks(objs, 'rMYADDR');
               expect(result.length).toBe(1);
               expect(result[0].id).toBe('IDX1');
               expect(result[0].sender).toBe('rSENDER');
          });

          it('should mark expired cashable checks', () => {
               const pastExpiry = 100; // well in the past relative to ripple epoch
               const objs = makeAccountObjects([
                    {
                         LedgerEntryType: 'Check',
                         Account: 'rSENDER',
                         Destination: 'rMYADDR',
                         index: 'IDX1',
                         SendMax: '1000000',
                         Expiration: pastExpiry,
                    },
               ]);
               const result = service.getCashableChecks(objs, 'rMYADDR');
               expect(result[0].isExpired).toBeTrue();
          });
     });

     describe('getCancelableChecks', () => {
          it('should return only checks sent by sender', () => {
               const objs = makeAccountObjects([xrpCheck('rSENDER', 'rDEST1', 'IDX1'), xrpCheck('rOTHER', 'rDEST2', 'IDX2')]);
               const result = service.getCancelableChecks(objs, 'rSENDER');
               expect(result.length).toBe(1);
               expect(result[0].id).toBe('IDX1');
               expect(result[0].destination).toBe('rDEST1');
          });
     });

     describe('getCheckById', () => {
          it('should find a check by id from cashable checks', () => {
               checksStore.setField('cashableChecks', [{ id: 'CASH1', amount: '5' }]);
               checksStore.setField('cancellableChecks', []);
               const found = service.getCheckById('CASH1');
               expect(found).toBeTruthy();
               expect((found as any).id).toBe('CASH1');
          });

          it('should find a check by id from cancellable checks', () => {
               checksStore.setField('cashableChecks', []);
               checksStore.setField('cancellableChecks', [{ id: 'CNCL1', amount: '3' }]);
               const found = service.getCheckById('CNCL1');
               expect((found as any).id).toBe('CNCL1');
          });

          it('should return undefined when id not found', () => {
               checksStore.setField('cashableChecks', []);
               checksStore.setField('cancellableChecks', []);
               expect(service.getCheckById('MISSING')).toBeUndefined();
          });
     });

     describe('getIssuerForCheck', () => {
          const checks = [
               { index: 'IDX1', Account: 'rSENDER', SendMax: { issuer: 'rISSUER', currency: 'USD', value: '10' } },
               { index: 'IDX2', Account: 'rSENDER2', SendMax: '1000000' },
          ];

          it('should return issuer for Token type', () => {
               const issuer = service.getIssuerForCheck(checks, 'IDX1', 'Token');
               expect(issuer).toBe('rISSUER');
          });

          it('should return Account for XRP type', () => {
               const issuer = service.getIssuerForCheck(checks, 'IDX1', 'XRP');
               expect(issuer).toBe('rSENDER');
          });

          it('should return null when check not found', () => {
               expect(service.getIssuerForCheck(checks, 'MISSING', 'Token')).toBeNull();
          });
     });

     describe('isCheckExpired', () => {
          it('should return false when expiration is undefined', () => {
               expect(service.isCheckExpired(undefined)).toBeFalse();
          });

          it('should return true when expiration is in the past', () => {
               // 0 = Jan 1 2000 in ripple time, which is definitely in the past
               expect(service.isCheckExpired(0)).toBeTrue();
          });

          it('should return false when expiration is far in the future', () => {
               const farFuture = Math.floor(Date.now() / 1000 - 946684800 + 99999999);
               expect(service.isCheckExpired(farFuture)).toBeFalse();
          });
     });

     describe('filteredCheckItems', () => {
          it('should return all items when query is empty', () => {
               const items = signal([
                    { id: 'IDX1', display: '10 XRP → rDEST1', secondary: 'IDX1', isCurrentAccount: false, currency: 'XRP', issuer: '' },
                    { id: 'IDX2', display: '5 USD → rDEST2', secondary: 'IDX2', isCurrentAccount: false, currency: 'USD', issuer: '' },
               ]);
               const query = signal('');
               const filtered = service.filteredCheckItems(items, query);
               expect(filtered().length).toBe(2);
          });

          it('should filter items by id', () => {
               const items = signal([
                    { id: 'AABBCC', display: '10 XRP → rDEST', secondary: 'AABBCC', isCurrentAccount: false, currency: 'XRP', issuer: '' },
                    { id: 'XXYYZZ', display: '5 XRP → rDEST2', secondary: 'XXYYZZ', isCurrentAccount: false, currency: 'XRP', issuer: '' },
               ]);
               const query = signal('aabb');
               const filtered = service.filteredCheckItems(items, query);
               expect(filtered().length).toBe(1);
               expect(filtered()[0].id).toBe('AABBCC');
          });
     });

     describe('checkIdDisplay', () => {
          it('should return search query when no id selected', () => {
               const selectedId = signal('');
               const items = signal([]);
               const query = signal('my search');
               const display = service.checkIdDisplay(selectedId, items, query);
               expect(display()).toBe('my search');
          });

          it('should return item display when id is selected and found', () => {
               const selectedId = signal('IDX1');
               const items = signal([{ id: 'IDX1', display: '10 XRP → rDEST', secondary: 'IDX1', isCurrentAccount: false, currency: 'XRP', issuer: '' }]);
               const query = signal('');
               const display = service.checkIdDisplay(selectedId, items, query);
               expect(display()).toBe('10 XRP → rDEST');
          });

          it('should return truncated id when item not found', () => {
               const selectedId = signal('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
               const items = signal([]);
               const query = signal('');
               const display = service.checkIdDisplay(selectedId, items, query);
               expect(display()).toContain('...');
          });
     });

     describe('mapCheckItems', () => {
          it('should map cashable checks with ← arrow', () => {
               const checks = signal([{ id: 'IDX1', sender: 'rSENDER123456', sendMax: '1000000', destination: 'rDEST' }]);
               const mode = signal<'cashCheck' | 'cancelCheck' | 'createCheck'>('cashCheck');
               const result = service.mapCheckItems(checks, mode, () => '1 XRP');
               const items = result();
               expect(items.length).toBe(1);
               expect(items[0].display).toContain('←');
          });

          it('should map cancellable checks with → arrow', () => {
               const checks = signal([{ id: 'IDX2', destination: 'rDEST7890', sender: undefined, sendMax: '500000' }]);
               const mode = signal<'cashCheck' | 'cancelCheck' | 'createCheck'>('cancelCheck');
               const result = service.mapCheckItems(checks, mode, () => '0.5 XRP');
               const items = result();
               expect(items[0].display).toContain('→');
          });
     });
});
