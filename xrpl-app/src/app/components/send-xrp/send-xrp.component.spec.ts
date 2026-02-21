import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { signal, WritableSignal, Signal } from '@angular/core';
import { BehaviorSubject, map, of } from 'rxjs';
import * as xrpl from 'xrpl';

import { SendXrpModernComponent } from './send-xrp.component';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService, TxStep } from '../../services/transaction-ui/transaction-ui.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

// ────────────────────────────────────────────────
// ToastService Mock
// ────────────────────────────────────────────────
class ToastServiceMock implements Partial<ToastService> {
     error = jasmine.createSpy('error');
     success = jasmine.createSpy('success');
}

// ────────────────────────────────────────────────
// TransactionUiService Mock — EXACT MATCH TO REAL TYPES
// ────────────────────────────────────────────────
class TransactionUiServiceMock implements Partial<TransactionUiService> {
     // Core state signals
     wantsOptions: WritableSignal<boolean> = signal(false);
     currentWallet: WritableSignal<Wallet> = signal({} as Wallet);
     currentStep: WritableSignal<TxStep> = signal('idle');
     detailedStatus: WritableSignal<string> = signal('');
     ticketArray: WritableSignal<string[]> = signal([]);
     signerQuorum: WritableSignal<number> = signal(0);
     signers: WritableSignal<any[]> = signal([]);
     regularKeySigningEnabled: WritableSignal<boolean> = signal(false);
     multiSigningEnabled: WritableSignal<boolean> = signal(false);

     // Form & tx-related signals
     amountField: WritableSignal<string> = signal('1.5');
     regularKeyAddress: WritableSignal<string> = signal('');
     regularKeySeed: WritableSignal<string> = signal('');
     multiSignAddress: WritableSignal<string> = signal('');
     multiSignSeeds: WritableSignal<string> = signal('');
     credentialIDs: WritableSignal<string[]> = signal([]);
     domainId: WritableSignal<string> = signal('');
     destinationTagField: WritableSignal<string> = signal('');
     invoiceIdField: WritableSignal<string> = signal('');
     sourceTagField: WritableSignal<string> = signal('');
     memoField: WritableSignal<string> = signal('');
     isMemoEnabled: WritableSignal<boolean> = signal(false);
     isSimulateEnabled: WritableSignal<boolean> = signal(false);
     isRegularKeyAddress: WritableSignal<boolean> = signal(false);
     useMultiSign: WritableSignal<boolean> = signal(false);
     isTicket: WritableSignal<boolean> = signal(false);
     selectedSingleTicket: WritableSignal<string> = signal('');
     selectedTickets: WritableSignal<string[]> = signal([]);

     // Computed signals — mock as read-only Signal (not writable)
     // stepMessage: Signal<string> = signal(''); // real is computed, so read-only
     explorerUrl: Signal<string> = signal('https://explorer/');

     // Methods (spies only)
     clearAllOptionsAndMessages = jasmine.createSpy('clearAllOptionsAndMessages');
     clearAllOptions = jasmine.createSpy('clearAllOptions');
     clearWarning = jasmine.createSpy('clearWarning');
     setWarning = jasmine.createSpy('setWarning');
     getValidationInputs = jasmine.createSpy('getValidationInputs').and.callFake((v: any) => v);
     setTxResultSignal = jasmine.createSpy('setTxResultSignal');
     clearAllFields = jasmine.createSpy('clearAllFields');
     resetCurrentStepToIdle = jasmine.createSpy('resetCurrentStepToIdle');
}

// ────────────────────────────────────────────────
// WalletManagerService Mock
// ────────────────────────────────────────────────
class WalletManagerServiceMock implements Partial<WalletManagerService> {
     wallets$ = new BehaviorSubject<Wallet[]>([]);
     selectedIndex$ = new BehaviorSubject<number>(0);
     hasWallets$ = new BehaviorSubject<boolean>(false);

     // Make sure this is a real observable (even if empty)
     hasWalletsFromWallets$ = this.wallets$.pipe(map(wallets => wallets.length > 0));

     getSelectedIndex = jasmine.createSpy('getSelectedIndex').and.returnValue(0);
}

// Minimal mocks for other services
class UtilsServiceMock implements Partial<UtilsService> {
     getWalletWithEncryptionAlgorithm = jasmine.createSpy().and.resolveTo({ classicAddress: 'rTEST' } as any);
     isTxSuccessful = jasmine.createSpy().and.returnValue(false);
     getTransactionResultMessage = jasmine.createSpy().and.returnValue('tefFAIL');
     processErrorMessageFromLedger = (m: string) => m;
     setTicketSequence = jasmine.createSpy();
     setDestinationTag = jasmine.createSpy();
     setMemoField = jasmine.createSpy();
     setInvoiceIdField = jasmine.createSpy();
     setSourceTagField = jasmine.createSpy();
     setDomainId = jasmine.createSpy();
     setCredentialIDsField = jasmine.createSpy();
     getAccountTickets = jasmine.createSpy().and.returnValue([]);
     checkForSignerAccounts = jasmine.createSpy().and.returnValue({ signerAccounts: [], signerQuorum: 0 });
     setRegularKeyProperties = jasmine.createSpy().and.returnValue({ regularKeyAddress: '', regularKeySeed: '' });
}

class XrplCacheServiceMock implements Partial<XrplCacheService> {
     getClient = jasmine.createSpy().and.callFake((factory: any) => factory());
     getAccountData = jasmine.createSpy().and.resolveTo({
          accountInfo: { result: { account_data: {} } },
          accountObjects: {},
     });
}

class ValidationServiceMock implements Partial<ValidationService> {
     validate = jasmine.createSpy('validate').and.resolveTo([]);
}

class TxEnvironmentServiceMock implements Partial<TxEnvironmentService> {
     prepareTxEnvironment = jasmine.createSpy().and.resolveTo({
          client: { isConnected: () => true } as any,
          wallet: { classicAddress: 'rTEST' } as any,
          accountInfo: { result: { account_data: {} } },
          accountObjects: {},
          fee: '12',
          currentLedger: 1000,
     });
}

fdescribe('SendXrpModernComponent', () => {
     let component: SendXrpModernComponent;
     let fixture: ComponentFixture<SendXrpModernComponent>;

     let walletManager: WalletManagerServiceMock;
     let txUi: TransactionUiServiceMock;
     let toast: ToastServiceMock;
     let validation: ValidationServiceMock;
     let txEnv: TxEnvironmentServiceMock;

     beforeEach(waitForAsync(async () => {
          await TestBed.configureTestingModule({
               imports: [SendXrpModernComponent],
               providers: [
                    { provide: UtilsService, useClass: UtilsServiceMock },
                    {
                         provide: StorageService,
                         useValue: (() => {
                              const store = new Map<string, any>();
                              return {
                                   get: jasmine.createSpy('get').and.callFake((key: string) => store.get(key) ?? null),
                                   set: jasmine.createSpy('set').and.callFake((key: string, value: any) => store.set(key, value)),
                                   removeValue: jasmine.createSpy('removeValue').and.callFake((key: string) => store.delete(key)),
                                   getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
                                   getNetworkColor: jasmine.createSpy('getNetworkColor').and.returnValue('#000'),
                              };
                         })(),
                    },
                    { provide: TransactionUiService, useClass: TransactionUiServiceMock },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: ToastService, useClass: ToastServiceMock },
                    { provide: XrplCacheService, useClass: XrplCacheServiceMock },
                    { provide: XrplTransactionExecutorService, useValue: { sendXrpPayment: jasmine.createSpy().and.resolveTo({ success: true, hash: 'testhash' }) } },
                    {
                         provide: XrplTransactionService,
                         useValue: {
                              waitForFinalOutcome: jasmine.createSpy().and.resolveTo({ result: 'tesSUCCESS' }),
                              buildSendXrpTransaction: jasmine.createSpy().and.returnValue({ TransactionType: 'Payment' } as any),
                              processTxFinalResult: jasmine.createSpy(),
                              processTxError: jasmine.createSpy(),
                         },
                    },
                    {
                         provide: XrplService,
                         useValue: {
                              getClient: jasmine.createSpy('getClient').and.resolveTo({ isConnected: () => true }),
                              getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
                              getLastLedgerIndex: jasmine.createSpy('getLastLedgerIndex').and.resolveTo(1000),
                              getAccountInfo: jasmine.createSpy('getAccountInfo').and.resolveTo({ result: { account_data: {} } }),
                              getAccountObjects: jasmine.createSpy('getAccountObjects').and.resolveTo({}),
                         },
                    },
                    { provide: WalletManagerService, useClass: WalletManagerServiceMock },
                    { provide: TxEnvironmentService, useClass: TxEnvironmentServiceMock },
                    { provide: ValidationService, useClass: ValidationServiceMock },
                    {
                         provide: HttpClient,
                         useValue: {
                              get: jasmine.createSpy('get').and.returnValue(of({})),
                              post: jasmine.createSpy('post').and.returnValue(of({})),
                              put: jasmine.createSpy('put').and.returnValue(of({})),
                              delete: jasmine.createSpy('delete').and.returnValue(of({})),
                         },
                    },
                    provideRouter([]),
                    {
                         provide: ActivatedRoute,
                         useValue: {
                              params: of({}),
                              queryParams: of({}),
                              fragment: of(null),
                              data: of({}),
                              snapshot: { params: {}, queryParams: {}, data: {} },
                              paramMap: of(new Map<string, string>()),
                              queryParamMap: of(new Map<string, string>()),
                         },
                    },
                    {
                         provide: Router,
                         useValue: {
                              events: of({}),
                              url: '/mock-route',
                              navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
                              navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
                         },
                    },
               ],
          }).compileComponents();

          // STUB NAVBAR TO PREVENT SUBSCRIBE CRASH
          TestBed.overrideComponent(NavbarComponent, {
               set: {
                    template: '<div>Mock Navbar</div>',
               },
          });

          fixture = TestBed.createComponent(SendXrpModernComponent);
          component = fixture.componentInstance;

          walletManager = TestBed.inject(WalletManagerService) as unknown as WalletManagerServiceMock;
          txUi = TestBed.inject(TransactionUiService) as unknown as TransactionUiServiceMock;
          toast = TestBed.inject(ToastService) as unknown as ToastServiceMock;
          validation = TestBed.inject(ValidationService) as unknown as ValidationServiceMock;
          txEnv = TestBed.inject(TxEnvironmentService) as unknown as TxEnvironmentServiceMock;

          // Seed data
          walletManager.wallets$.next([
               {
                    address: 'rSOURCE',
                    classicAddress: 'rSOURCE',
                    seed: 'sseed',
                    encryptionAlgorithm: 'ed25519',
               } as Wallet,
          ]);
          walletManager.hasWallets$.next(true);

          fixture.detectChanges();
          await fixture.whenStable();
     }));

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should round amount correctly', () => {
          component.updateAmount('1.23456789');
          expect(txUi.amountField()).toBe('1.234568');
     });

     it('should clear amount on invalid input', () => {
          component.updateAmount('abc');
          expect(txUi.amountField()).toBe('');
     });

     it('should auto-select valid address via effect', async () => {
          spyOn(xrpl, 'isValidAddress').and.returnValue(true);
          component.destinationSearchQuery.set('rValid1234567890ABCDEF');
          fixture.detectChanges();
          await fixture.whenStable();
          expect(component.selectedDestinationAddress()).toBe('rValid1234567890ABCDEF');
     });

     it('should show error toast when validation fails in onAccountChange', async () => {
          validation.validate.and.resolveTo(['Invalid amount', 'Invalid tag']);
          await component.onAccountChange(false);
          expect(toast.error).toHaveBeenCalledWith('Invalid amount\n• Invalid tag', jasmine.any(String));
     });

     it('should simulate sendXrp successfully', async () => {
          spyOn(xrpl, 'isValidAddress').and.returnValue(true);
          component.selectedDestinationAddress.set('rDESTVALID');
          txUi.amountField.set('10');
          txUi.isSimulateEnabled.set(true);

          await component.sendXrp();

          expect(toast.success).toHaveBeenCalled();
          expect(component.clearInputFields).toHaveBeenCalled();
     });
});
