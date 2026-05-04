import { TestBed } from '@angular/core/testing';
import { TrustlineViewModelService } from './trustline-view-model.service';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { signal, WritableSignal } from '@angular/core';

describe('TrustlineViewModelService', () => {
     let service: TrustlineViewModelService;
     let mockWalletManagerService: jasmine.SpyObj<WalletManagerService>;
     let mockTrustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;
     let mockCurrencyStoreService: jasmine.SpyObj<typeof CurrencyStoreService>;
     let mockTrustlineStoreService: any;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;

     let currentStepSignal: WritableSignal<string>;
     let currencySignal: WritableSignal<string>;
     let issuerSignal: WritableSignal<string>;
     let balanceSignal: WritableSignal<string>;
     let existingIOUsSignal: WritableSignal<any[]>;
     let currencyItemsSignal: WritableSignal<any[]>;
     let issuerItemsSignal: WritableSignal<any[]>;
     let flagsSignal: WritableSignal<any>;
     let isLoadingSignal: WritableSignal<boolean>;

     const mockWallet = {
          address: 'rTestAddress1234567890',
          classicAddress: 'rTestAddress1234567890',
          name: 'Test Wallet',
          seed: 'test-seed',
     };

     beforeEach(() => {
          currentStepSignal = signal<string>('idle');
          currencySignal = signal<string>('USD');
          issuerSignal = signal<string>('rIssuerAddress');
          balanceSignal = signal<string>('1000');
          existingIOUsSignal = signal<any[]>([
               {
                    currency: 'USD',
                    issuer: 'rIssuerAddress',
                    balance: '500',
                    limit: '10000',
                    flags: ['NoRipple'],
               },
               {
                    currency: 'EUR',
                    issuer: 'rOtherIssuer',
                    balance: '0',
                    limit: '0',
                    flags: [],
               },
          ]);
          currencyItemsSignal = signal<any[]>([
               { id: 'USD', display: 'USD', group: 'Currency' },
               { id: 'EUR', display: 'EUR', group: 'Currency' },
          ]);
          issuerItemsSignal = signal<any[]>([
               { id: 'rIssuerAddress', display: 'rIssuerAddress', group: 'Issuer' },
               { id: 'rOtherIssuer', display: 'rOtherIssuer', group: 'Issuer' },
          ]);
          flagsSignal = signal<any>({ tfClearNoRipple: false });
          isLoadingSignal = signal<boolean>(false);

          mockWalletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
          mockTrustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['currencyItems', 'issuerItems', 'flags']);
          mockCurrencyStoreService = jasmine.createSpyObj('CurrencyStoreService', ['currency', 'issuer', 'balance']);
          mockTrustlineStoreService = {
               existingIOUs: existingIOUsSignal,
               isLoading: isLoadingSignal,
               currentTrustline: jasmine.createSpy().and.callFake((currency: string, issuer: string) => {
                    return existingIOUsSignal().find((tl: any) => tl.currency === currency && tl.issuer === issuer) || null;
               }),
               setField: jasmine.createSpy(),
               updateField: jasmine.createSpy(),
               reset: jasmine.createSpy(),
               getAll: jasmine.createSpy(),
               resetOptions: jasmine.createSpy(),
               setLoading: jasmine.createSpy(),
               setLoaded: jasmine.createSpy(),
               setError: jasmine.createSpy(),
          };
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['currentStep', 'stepMessage', 'explorerUrl']);

          mockWalletManagerService.getSelectedWallet.and.returnValue(mockWallet as any);
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org');

          Object.defineProperty(mockTrustlineCurrencyService, 'currencyItems', { get: () => currencyItemsSignal });
          Object.defineProperty(mockTrustlineCurrencyService, 'issuerItems', { get: () => issuerItemsSignal });
          Object.defineProperty(mockTrustlineCurrencyService, 'flags', { get: () => flagsSignal });
          Object.defineProperty(mockCurrencyStoreService, 'currency', { get: () => currencySignal });
          Object.defineProperty(mockCurrencyStoreService, 'issuer', { get: () => issuerSignal });
          Object.defineProperty(mockCurrencyStoreService, 'balance', { get: () => balanceSignal });
          Object.defineProperty(mockTxUiService, 'currentStep', { get: () => currentStepSignal });

          TestBed.configureTestingModule({
               providers: [TrustlineViewModelService, { provide: WalletManagerService, useValue: mockWalletManagerService }, { provide: TrustlineCurrencyService, useValue: mockTrustlineCurrencyService }, { provide: CurrencyStoreService, useValue: mockCurrencyStoreService }, { provide: TrustlineStoreService, useValue: mockTrustlineStoreService }, { provide: TransactionUiService, useValue: mockTxUiService }],
          });

          service = TestBed.inject(TrustlineViewModelService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should initialize activeTab to setTrustline', () => {
               expect(service.activeTab()).toBe('setTrustline');
          });
     });

     describe('isBusy', () => {
          it('should return false when step is idle', () => {
               currentStepSignal.set('idle');
               expect(service.isBusy()).toBe(false);
          });

          it('should return true when step is not idle', () => {
               currentStepSignal.set('preparing');
               expect(service.isBusy()).toBe(true);
          });
     });

     describe('selectedIssuerAddress', () => {
          it('should return issuer from currency store', () => {
               expect(service.selectedIssuerAddress()).toBe('rIssuerAddress');
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return matching currency item', () => {
               const item = service.selectedCurrencyItem();
               expect(item?.id).toBe('USD');
          });

          it('should return null when no match found', () => {
               currencySignal.set('GBP');
               const item = service.selectedCurrencyItem();
               expect(item).toBeNull();
          });
     });

     describe('selectedIssuerItem', () => {
          it('should return matching issuer item', () => {
               const item = service.selectedIssuerItem();
               expect(item?.id).toBe('rIssuerAddress');
          });
     });

     describe('isIssuerForSelected', () => {
          it('should return true when wallet is the issuer', () => {
               issuerSignal.set(mockWallet.address);
               expect(service.isIssuerForSelected()).toBe(true);
          });

          it('should return false when wallet is not the issuer', () => {
               issuerSignal.set('rOtherAddress');
               expect(service.isIssuerForSelected()).toBe(false);
          });

          it('should return false when no wallet', () => {
               mockWalletManagerService.getSelectedWallet.and.returnValue(null);
               expect(service.isIssuerForSelected()).toBe(false);
          });
     });

     describe('actionButtonLabel', () => {
          it('should return "Issue Tokens" when issuer', () => {
               issuerSignal.set(mockWallet.address);
               expect(service.actionButtonLabel()).toBe('Issue Tokens');
          });

          it('should return "Send Tokens" when not issuer', () => {
               issuerSignal.set('rOtherAddress');
               expect(service.actionButtonLabel()).toBe('Send Tokens');
          });
     });

     describe('formTitle', () => {
          it('should return issue title when issuer', () => {
               issuerSignal.set(mockWallet.address);
               expect(service.formTitle()).toBe('Issue new tokens to destination');
          });

          it('should return send title when not issuer', () => {
               issuerSignal.set('rOtherAddress');
               expect(service.formTitle()).toBe('Send held tokens to destination');
          });
     });

     describe('isSplitLayout', () => {
          it('should return true for setTrustline', () => {
               service.activeTab.set('setTrustline');
               expect(service.isSplitLayout()).toBe(true);
          });

          it('should return true for removeTrustline', () => {
               service.activeTab.set('removeTrustline');
               expect(service.isSplitLayout()).toBe(true);
          });

          it('should return false for other tabs', () => {
               service.activeTab.set('issueCurrency');
               expect(service.isSplitLayout()).toBe(false);
          });
     });

     describe('currencyLayout', () => {
          it('should return "split" for setTrustline', () => {
               service.activeTab.set('setTrustline');
               expect(service.currencyLayout()).toBe('split');
          });

          it('should return "paired" for issueCurrency', () => {
               service.activeTab.set('issueCurrency');
               expect(service.currencyLayout()).toBe('paired');
          });
     });

     describe('trustlinesToShow', () => {
          it('should show all trustlines for setTrustline', () => {
               service.activeTab.set('setTrustline');
               expect(service.trustlinesToShow().length).toBe(2);
          });

          // it('should show removable trustlines for removeTrustline', () => {
          //      service.activeTab.set('removeTrustline');
          //      const trustlines = service.trustlinesToShow();
          //      expect(trustlines.length).toBe(0);
          // });
     });

     describe('infoData', () => {
          it('should return loading state when no wallet', () => {
               mockWalletManagerService.getSelectedWallet.and.returnValue(null);
               const info = service.infoData();
               expect(info.isLoading).toBe(true);
          });

          it('should return loading state when trustline store is loading', () => {
               isLoadingSignal.set(true);
               const info = service.infoData();
               expect(info.isLoading).toBe(true);
          });

          it('should return wallet info when loaded', () => {
               const info = service.infoData();
               expect(info.walletName).toBe('Test Wallet');
               expect(info.activeTab).toBe('setTrustline');
               expect(info.isLoading).toBe(false);
          });

          it('should generate explorer link when trustlines exist', () => {
               const info = service.infoData();
               expect(info.links).toContain('View on explorer');
          });

          it('should not generate explorer link when no trustlines', () => {
               existingIOUsSignal.set([]);
               const info = service.infoData();
               expect(info.links).toBe('');
          });
     });

     describe('button labels', () => {
          it('should have trustlineSetButtonLabel', () => {
               expect(service.trustlineSetButtonLabel()).toBe('Set Trustline');
          });

          it('should have trustlineRemoveButtonLabel', () => {
               expect(service.trustlineRemoveButtonLabel()).toBe('Remove Trustline');
          });

          it('should have issueCurrencyButtonLabel', () => {
               expect(service.issueCurrencyButtonLabel()).toBe('Issue Currency');
          });

          it('should have clawbackButtonLabel', () => {
               expect(service.clawbackButtonLabel()).toBe('Clawback Tokens');
          });
     });
});
