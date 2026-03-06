import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import * as xrpl from 'xrpl';

import { TrustlinesComponent } from './trustlines.component';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';

// Minimal stubs mirroring style from send-xrp tests
class ToastServiceStub {
     success = jasmine.createSpy('success');
     error = jasmine.createSpy('error');
}
class StorageServiceStub {
     private store = new Map<string, any>();
     get(k: string) {
          return this.store.get(k) || null;
     }
     set(k: string, v: any) {
          this.store.set(k, v);
     }
     removeValue(k: string) {
          this.store.delete(k);
     }
}
class UtilsServiceStub {
     encodeIfNeeded = (c: string) => c;
     decodeIfNeeded = (c: string) => c;
     normalizeCurrencyCode = (c: string) => c;
     getWalletWithEncryptionAlgorithm = jasmine.createSpy('getWalletWithEncryptionAlgorithm').and.returnValue(Promise.resolve({ classicAddress: 'rCLASSIC', address: 'rCLASSIC' } as any));
     setTicketSequence() {}
     setDestinationTag() {}
     setMemoField() {}
     getAccountTickets = () => [];
     checkForSignerAccounts = () => ({ signerAccounts: [], signerQuorum: 0 });
     setRegularKeyProperties = () => ({ regularKeyAddress: '', regularKeySeed: '' });
     logObjects() {}
     formatInvoiceId = (id: string) => id;
     convertXRPLTime = (t: number) => 'date';
}
class XrplCacheServiceStub {
     getClient = (f: any) => f();
     getAccountData = jasmine.createSpy('getAccountData').and.resolveTo({ accountInfo: { result: { account_data: {} } }, accountObjects: { result: { account_objects: [] } } });
}
class XrplServiceStub {
     getClient = jasmine.createSpy('getClient').and.resolveTo({} as any);
     getAccountInfo = jasmine.createSpy('getAccountInfo').and.resolveTo({ result: { account_data: {} } });
     getAccountObjects = jasmine.createSpy('getAccountObjects').and.resolveTo({ result: { account_objects: [] } });
     getAccountLines = jasmine.createSpy('getAccountLines').and.resolveTo({ result: { lines: [] } });
     getXrplServerInfo = jasmine.createSpy('getXrplServerInfo').and.resolveTo({});
     calculateTransactionFee = jasmine.createSpy('calculateTransactionFee').and.resolveTo('12');
     getLastLedgerIndex = jasmine.createSpy('getLastLedgerIndex').and.resolveTo(1000);
     checkTicketExists = jasmine.createSpy('checkTicketExists').and.resolveTo(true);
}
class XrplTransactionExecutorServiceStub {
     setTrustline = jasmine.createSpy('setTrustline').and.resolveTo({ success: true });
     removeTrustline = jasmine.createSpy('removeTrustline').and.resolveTo({ success: true });
     issueCurrency = jasmine.createSpy('issueCurrency').and.resolveTo({ success: true });
     clawbackTokens = jasmine.createSpy('clawbackTokens').and.resolveTo({ success: true });
}
class DestinationDropdownServiceStub {
     formatDisplay = (d: any) => (d.name ? `${d.name} (${d.address.slice(0, 6)}...${d.address.slice(-6)})` : d.address);
}
class WalletDataServiceStub {
     refreshWallets = jasmine.createSpy('refreshWallets').and.callFake(async (_c: any, w: Wallet[], _i: number, _a?: string[], cb?: any) => {
          if (cb) cb(w, w[0] ?? ({} as any));
     });
}
class TransactionUiServiceStub {
     spinner = { set: jasmine.createSpy('spinner.set') } as any;
     currentWallet = { set: jasmine.createSpy('currentWallet.set') } as any;
     ticketArray = { set: jasmine.createSpy('ticketArray.set') } as any;
     signerQuorum = { set: jasmine.createSpy('signerQuorum.set') } as any;
     signers = { set: jasmine.createSpy('signers.set') } as any;
     regularKeySigningEnabled = { set: jasmine.createSpy('regularKeySigningEnabled.set') } as any;
     memoField = Object.assign(jasmine.createSpy('memoField').and.returnValue('') as any, { set: jasmine.createSpy('memoField.set') });
     explorerUrl = () => 'https://explorer/';
     clearAllOptionsAndMessages = jasmine.createSpy('clearAllOptionsAndMessages');
     clearAllOptions = jasmine.createSpy('clearAllOptions');
     setWarning = jasmine.createSpy('setWarning');
     clearWarning = jasmine.createSpy('clearWarning');
     setError = jasmine.createSpy('setError');
     showToastMessage = jasmine.createSpy('showToastMessage');
     useMultiSign = () => false;
     isRegularKeyAddress = () => false;
     regularKeyAddress = () => '';
     regularKeySeed = () => '';
     multiSignAddress = () => '';
     multiSignSeeds = () => '';
     isTicket = () => false;
     selectedSingleTicket = () => undefined as any;
     selectedTickets = () => [] as any;
     isMemoEnabled = () => false;
}
class WalletManagerServiceStub {
     wallets$ = new BehaviorSubject<Wallet[]>([]);
     selectedIndex$ = new BehaviorSubject<number>(0);
     hasWalletsFromWallets$ = this.wallets$.asObservable();
     getSelectedIndex = () => 0;
}
class TrustlineCurrencyServiceStub {
     currencies$ = new BehaviorSubject<string[]>(['XRP']);
     issuers$ = new BehaviorSubject<{ name?: string; address: string }[]>([]);
     selectedIssuer$ = new BehaviorSubject<string>('');
     balance$ = new BehaviorSubject<string>('0');
     getCurrencies = () => ['XRP'];
     getIssuersForCurrency = (_: string) => [] as string[];
     selectCurrency = jasmine.createSpy('selectCurrency');
     selectIssuer = jasmine.createSpy('selectIssuer');
     getSelectedIssuer = () => '';
     addToken = jasmine.createSpy('addToken');
     removeToken = jasmine.createSpy('removeToken');
}

describe('TrustlinesComponent', () => {
     let component: TrustlinesComponent;
     let fixture: ComponentFixture<TrustlinesComponent>;
     let walletSvc: WalletManagerServiceStub;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TrustlinesComponent],
               providers: [
                    { provide: UtilsService, useClass: UtilsServiceStub },
                    { provide: StorageService, useClass: StorageServiceStub },
                    { provide: TransactionUiService, useClass: TransactionUiServiceStub },
                    { provide: WalletDataService, useClass: WalletDataServiceStub },
                    { provide: DestinationDropdownService, useClass: DestinationDropdownServiceStub },
                    { provide: ToastService, useClass: ToastServiceStub },
                    { provide: XrplCacheService, useClass: XrplCacheServiceStub },
                    { provide: XrplTransactionExecutorService, useClass: XrplTransactionExecutorServiceStub },
                    { provide: ValidationService, useValue: { validate: () => Promise.resolve([]) } },
                    { provide: TrustlineCurrencyService, useClass: TrustlineCurrencyServiceStub },
                    { provide: XrplService, useClass: XrplServiceStub },
                    { provide: WalletManagerService, useClass: WalletManagerServiceStub },
               ],
          })
               .overrideComponent(TrustlinesComponent, { set: { template: '' } })
               .compileComponents();

          fixture = TestBed.createComponent(TrustlinesComponent);
          component = fixture.componentInstance;
          walletSvc = TestBed.inject(WalletManagerService) as any;

          // Seed with one wallet
          walletSvc.wallets$.next([{ address: 'rSOURCE', classicAddress: 'rSOURCE', seed: 'sseed', encryptionAlgorithm: 'ed25519', name: 'Main' } as Wallet]);

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('auto-selects valid typed address into selectedDestinationAddress via effect', () => {
          // ensure not in destinations list so effect sets it
          (component as any).destinationSearchQuery.set('rXYZVALID');
          // trigger effect microtask
          fixture.detectChanges();
          expect((component as any).selectedDestinationAddress()).toBe('rXYZVALID');
     });

     it('onCurrencySelected updates currency and calls onCurrencyChange', () => {
          spyOn(component, 'onCurrencyChange');
          component.onCurrencySelected({ id: 'USD' } as any);
          expect((component as any).currencyFieldDropDownValue()).toBe('USD');
          expect(component.onCurrencyChange).toHaveBeenCalledWith('USD');
     });

     it('onIssuerSelected updates selected issuer via service and triggers onIssuerChange', () => {
          spyOn(component, 'onIssuerChange');
          component.onIssuerSelected({ id: 'rISSUER' } as any);
          expect(component.onIssuerChange).toHaveBeenCalledWith('rISSUER');
     });

     // it('toggleFlag recalculates totalFlagsValue and hex', () => {
     //      const initial = (component as any).totalFlagsValue();
     //      component.toggleFlag('tfSetNoRipple');
     //      const after = (component as any).totalFlagsValue();
     //      expect(after).not.toBe(initial);
     //      expect((component as any).totalFlagsHex()).toMatch(/^0x[0-9A-F]+$/);
     // });

     it('isAddValid validates currency and issuer and prevents duplicates', () => {
          const tls = TestBed.inject(TrustlineCurrencyService) as any as TrustlineCurrencyServiceStub;
          spyOn((component as any).newCurrency, 'call' as any); // guard
          (component as any).newCurrency.set('USD');
          (component as any).newIssuer.set('rISSUER');
          spyOn(TestBed.inject(UtilsService) as any, 'isValidCurrencyCode').and.returnValue(true);
          spyOn(xrpl, 'isValidAddress').and.returnValue(true);
          spyOn(tls, 'getIssuersForCurrency').and.returnValue([]);

          expect(component.isAddValid()).toBeTrue();

          // Duplicate case
          spyOn(tls, 'getIssuersForCurrency').and.returnValue(['rISSUER']);
          expect(component.isAddValid()).toBeFalse();
     });

     it('removeCurrentCurrencyIssuer removes selected token and shows toast', () => {
          const tls = TestBed.inject(TrustlineCurrencyService) as any as TrustlineCurrencyServiceStub;
          const toast = TestBed.inject(ToastService) as any as ToastServiceStub;

          spyOn(component, 'isRemoveValid').and.returnValue(true);
          spyOn(tls, 'getSelectedIssuer').and.returnValue('rISSUER');
          spyOn(tls, 'getIssuersForCurrency').and.returnValue([]);

          // set current currency
          (component as any).currencyFieldDropDownValue.set('USD');

          component.removeCurrentCurrencyIssuer();

          expect(tls.removeToken).toHaveBeenCalledWith('USD', 'rISSUER');
          expect(toast.success).toHaveBeenCalled();
     });
});
