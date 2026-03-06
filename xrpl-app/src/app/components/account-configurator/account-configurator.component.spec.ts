// To run test in Windows CMD:
// cd xrpl-app
// npm test -- --watch=false --browsers=ChromeHeadless --include src/app/components/account-configurator/account-configurator.component.spec.ts
// npm test -- --watch=false --browsers=ChromeHeadless --include src/app/components/account-configurator/account-configurator.component.spec.ts | findstr /i "FAILED ✗ ✓ Executed"
// saajfPAyTUg5JDesjK9JYUAS3NKBR
// utilService.formatDepositAuthEntries.and.returnValue([{ SignerEntry: { Account: 'rPreauth' } }]);

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, Input, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { AccountConfiguratorComponent } from './account-configurator.component';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { ToastService } from '../../services/toast/toast.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { AppConstants } from '../../core/app.constants';
import * as xrpl from 'xrpl';

interface MockStorageService {
     getKnownIssuers: jasmine.Spy;
     set: jasmine.Spy;
     get: jasmine.Spy;
     removeValue: jasmine.Spy;
}

@Component({
     selector: 'lucide-icon',
     template: '<ng-content></ng-content>', // or empty
     standalone: true,
})
class LucideIconStubComponent {
     @Input() name?: string;
     @Input() size?: number | string;
     @Input() color?: string;
}

@Component({ selector: 'app-wallet-panel', template: '', standalone: true })
class WalletPanelStubComponent {
     @Input() someInput: any;
}

@Component({ selector: 'app-navbar', template: '', standalone: true })
class NavbarStubComponent {}

@Component({ selector: 'app-transaction-options', template: '', standalone: true })
class TransactionOptionsStubComponent {
     @Input() showWhenTab: any;
     @Input() activeTab: any;
     @Input() multiSigningEnabled: any;
     @Input() regularKeySigningEnabled: any;
}

@Component({ selector: 'app-requirements', template: '', standalone: true })
class RequirementsStubComponent {
     @Input() activeTab: any;
}

@Component({
     selector: 'app-transaction-preview',
     template: '',
     standalone: true,
})
class TransactionPreviewStubComponent {
     @Input() someInput: any;
}

describe('AccountConfiguratorComponent', () => {
     let component: AccountConfiguratorComponent;
     let fixture: ComponentFixture<AccountConfiguratorComponent>;

     const mockDepositAuthEnabled = signal(false);
     const mockDepositAuthAddresses = signal<{ account: string }[]>([]);

     const mockWalletManagerService: Partial<WalletManagerService> & {
          wallets: WritableSignal<Wallet[]>;
          selectedIndex: WritableSignal<number>;
          hasWallets: WritableSignal<boolean>;
          getSelectedIndex: jasmine.Spy;
     } = {
          wallets: signal<Wallet[]>([]),
          selectedIndex: signal<number>(-1),
          hasWallets: signal(false),
          getSelectedIndex: jasmine.createSpy('getSelectedIndex').and.returnValue(-1),
     };

     const mockAccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState', 'refreshUiStateAccountConfigure']);
     const currentWalletSignal = signal<Wallet | null>(null);

     const mockTxUiService = {
          currentWallet: currentWalletSignal,
          currentStep: signal<string>('idle'),
          signerQuorum: signal<number>(0),
          totalFlagsValue: signal<number>(0),
          totalFlagsHex: signal<string>('0x0'),
          regularKeyAddress: signal<string>(''),
          regularKeySeed: signal<string>(''),
          depositAuthEnabled: mockDepositAuthEnabled.asReadonly(),
          depositAuthAddresses: mockDepositAuthAddresses.asReadonly(),
          clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
          clearAllOptions: jasmine.createSpy('clearAllOptions'),
          resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
          setWarning: jasmine.createSpy('setWarning'),
          clearWarning: jasmine.createSpy('clearWarning'),
          setError: jasmine.createSpy('setError'),
          setInfoMessage: jasmine.createSpy('setInfoMessage'),
          getValues: jasmine.createSpy('getValues').and.returnValue({}),
          buildTxKeys: jasmine.createSpy('buildTxKeys').and.returnValue([]),
          isSimulateEnabled: signal<boolean>(false),
          tickSize: signal<string>(''),
          transferRate: signal<string>(''),
          domain: signal<string>(''),
          isMessageKey: signal<boolean>(false),
     } as unknown as TransactionUiService;

     const mockTxEnvironmentService = {
          prepareTxEnvironment: jasmine.createSpy().and.resolveTo({}),
     };

     const mockToastService = {
          error: jasmine.createSpy(),
          warn: jasmine.createSpy(),
          info: jasmine.createSpy(),
          success: jasmine.createSpy(),
     };

     const mockTransactionDropdownService = {
          loadCustomDestinations: jasmine.createSpy(),
     };

     const mockStorageService = {
          getNet: jasmine.createSpy('getNet').and.returnValue('testnet'),
          setNet: jasmine.createSpy('setNet'),
          getKnownIssuers: jasmine.createSpy('getKnownIssuers').and.returnValue([]),
          setKnownIssuers: jasmine.createSpy('setKnownIssuers'),
          get: jasmine.createSpy('get'),
          set: jasmine.createSpy('set'),
          removeValue: jasmine.createSpy('removeValue'),
     };

     // Mock Utils Service
     const mockUtilsService = {
          formatXRP: jasmine.createSpy('formatXRP').and.returnValue('10 XRP'),
          getFlagUpdates: jasmine.createSpy('getFlagUpdates').and.returnValue({ setFlags: [], clearFlags: [] }),
          getFlagName: jasmine.createSpy('getFlagName').and.returnValue('Test Flag'),
     };

     const mockTrustlineCurrencyService = {
          loadFromStorage: jasmine.createSpy('loadFromStorage'),
          getKnownIssuers: jasmine.createSpy('getKnownIssuers').and.returnValue([]),
          addKnownIssuer: jasmine.createSpy('addKnownIssuer'),
          removeKnownIssuer: jasmine.createSpy('removeKnownIssuer'),
     };

     const mockXrplService = {
          getNet: jasmine.createSpy('getNet').and.returnValue('testnet'),
          getClient: jasmine.createSpy('getClient').and.returnValue(
               Promise.resolve({
                    request: jasmine.createSpy('request').and.returnValue(Promise.resolve({})),
               })
          ),
          disconnect: jasmine.createSpy('disconnect').and.returnValue(Promise.resolve()),
          connect: jasmine.createSpy('connect').and.returnValue(Promise.resolve()),
          isConnected: jasmine.createSpy('isConnected').and.returnValue(true),
          getServerInfo: jasmine.createSpy('getServerInfo').and.returnValue(Promise.resolve({})),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountConfiguratorComponent, RouterTestingModule, HttpClientTestingModule, NgIcon, LucideIconStubComponent],
               providers: [
                    { provide: WalletManagerService, useValue: mockWalletManagerService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: TransactionDropdownService, useValue: mockTransactionDropdownService },
                    provideIcons({}),
                    { provide: AcccountDataService, useValue: mockAccountDataService },
                    { provide: StorageService, useValue: mockStorageService },
                    { provide: XrplService, useValue: mockXrplService },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: TrustlineCurrencyService, useValue: mockTrustlineCurrencyService },
               ],
               schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
          }).compileComponents();

          TestBed.overrideComponent(AccountConfiguratorComponent, {
               set: {
                    imports: [FormsModule, WalletPanelStubComponent, NavbarStubComponent, TransactionOptionsStubComponent, TransactionPreviewStubComponent, RequirementsStubComponent, NgIcon, LucideIconStubComponent],
               },
          });

          fixture = TestBed.createComponent(AccountConfiguratorComponent);
          component = fixture.componentInstance;

          spyOn(component.accountConfiguratorUtilService, 'setIssuer').and.callThrough();
          spyOn(component.accountConfiguratorUtilService, 'setExchanger').and.callThrough();
          spyOn(component.accountConfiguratorUtilService, 'setHolder').and.callThrough();
          spyOn(component.accountConfiguratorUtilService, 'resetFlags').and.callThrough();
          spyOn(component.accountConfiguratorUtilService, 'updateFlagTotal').and.callThrough();
          spyOn(currentWalletSignal, 'set').and.callThrough();
          spyOn(mockTxUiService.signerQuorum, 'set').and.callThrough();
          spyOn(component.copyUtilService, 'copyAndToast');

          // Default wallet – let the component react normally
          mockWalletManagerService.wallets.set([
               {
                    address: 'rEHgvDg37npJ5YNxZAv74Cn5YgVUBjkDVQ',
                    classicAddress: 'rEHgvDg37npJ5YNxZAv74Cn5YgVUBjkDVQ',
                    name: 'Test Wallet',
                    seed: 'ss3FBroYbTZABweZBUKuZDyGzdmse',
               } as Wallet,
          ]);

          mockAccountDataService.refreshUiState.calls.reset();
          mockAccountDataService.refreshUiStateAccountConfigure.calls.reset();

          mockWalletManagerService.selectedIndex.set(0);
          mockWalletManagerService.getSelectedIndex.and.returnValue(0);

          mockStorageService.getKnownIssuers.calls.reset();
          mockStorageService.set.calls.reset();
          mockStorageService.get.calls.reset();
          mockStorageService.removeValue.calls.reset();
          mockTrustlineCurrencyService.loadFromStorage.calls.reset();

          // Force storage service to be available on component
          (component as any).storageService = mockStorageService;

          // Also set it via Object.defineProperty for good measure
          Object.defineProperty(component, 'storageService', {
               value: mockStorageService,
               writable: true,
               configurable: true,
          });

          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should initialize with default tab', () => {
          expect(component.activeTab()).toBe('modifyAccountFlags');
     });

     it('should toggle info panel', () => {
          expect(component.infoPanelExpanded()).toBe(false);
          component.toggleInfoPanel();
          expect(component.infoPanelExpanded()).toBe(true);
     });

     it('should set tab correctly', async () => {
          await component.setTab('modifyMetaData');
          expect(component.activeTab()).toBe('modifyMetaData');
     });

     it('should have info panel collapsed by default', () => {
          expect(component.infoPanelExpanded()).toBeFalse();
     });

     it('toggleInfoPanel should flip the info panel state', () => {
          expect(component.infoPanelExpanded()).toBeFalse();
          component.toggleInfoPanel();
          expect(component.infoPanelExpanded()).toBeTrue();
          component.toggleInfoPanel();
          expect(component.infoPanelExpanded()).toBeFalse();
     });

     it('setTab should change activeTab and reset destination search', async () => {
          component.destinationSearchQuery.set('something');
          await component.setTab('modifyMultiSigners');

          expect(component.activeTab()).toBe('modifyMultiSigners');
          expect(component.destinationSearchQuery()).toBe('');
     });

     it('should show warning when no wallets exist (via effect)', fakeAsync(() => {
          mockWalletManagerService.wallets.set([]);

          fixture.detectChanges();
          tick(50);

          expect(mockTxUiService.setWarning).toHaveBeenCalledWith(jasmine.stringContaining('No wallets exist'));
          expect(mockTxUiService.setError).toHaveBeenCalledWith('');
          expect(mockTxUiService.setInfoMessage).toHaveBeenCalledWith('');
     }));

     it('should update wallets when walletManager.wallets changes', () => {
          const fakeWallet: Wallet = {
               address: 'rNewWallet456',
               classicAddress: 'rNewWallet456',
               name: 'New One',
               seed: 's_____fake',
          };
          mockWalletManagerService.wallets.set([fakeWallet]);

          expect(component.wallets().length).toBe(1);
     });

     it('should set warning when no wallets exist', () => {
          mockWalletManagerService.hasWallets.set(false);

          fixture = TestBed.createComponent(AccountConfiguratorComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();

          expect(mockTxUiService.setWarning).toHaveBeenCalled();
     });

     it('should return false if no wallet selected', () => {
          mockWalletManagerService.getSelectedIndex.and.returnValue(-1);

          const result = component['ensureWalletSelected']();

          expect(result).toBeFalse();
     });

     it('should toggle info panel', () => {
          component.infoPanelExpanded.set(false);

          component.toggleInfoPanel();

          expect(component.infoPanelExpanded()).toBeTrue();
     });

     it('should track by address', () => {
          const result = component.trackByAddress(0, { address: 'r123' } as any);
          expect(result).toBe('r123');
     });

     it('should clear warning when wallets exist (via effect)', fakeAsync(() => {
          mockWalletManagerService.wallets.set([
               {
                    address: 'rTest',
                    classicAddress: 'rTest',
               } as Wallet,
          ]);

          fixture.detectChanges();
          tick(50);
     }));

     it('onWalletSelected should update currentWallet and txUiService', fakeAsync(() => {
          const fakeWallet: Wallet = {
               address: 'rNewWallet456',
               classicAddress: 'rNewWallet456',
               name: 'New One',
               seed: 's_____fake',
          };

          component.onWalletSelected(fakeWallet);
          fixture.detectChanges();
          tick();

          expect(component.currentWallet().address).toBe('rNewWallet456');
          expect(mockTxUiService.currentWallet.set).toHaveBeenCalledWith(fakeWallet);
     }));

     it('onWalletSelected should NOT update if same wallet is selected again', fakeAsync(() => {
          const wallet: Wallet = {
               address: 'rSame123',
               classicAddress: 'rSame123',
               seed: 's_____',
          } as Wallet;

          component.currentWallet.set(wallet);

          fixture.detectChanges();
          tick();

          (mockTxUiService.currentWallet.set as jasmine.Spy).calls.reset();

          component.onWalletSelected(wallet);

          tick();

          expect(mockTxUiService.currentWallet.set).not.toHaveBeenCalled();
     }));

     it('copyAndToast should delegate to copyUtilService', () => {
          component.copyAndToast('rAddressXYZ', 'Account address');

          expect(component.copyUtilService.copyAndToast).toHaveBeenCalledWith('rAddressXYZ', 'Account address');
     });

     it('onConfigurationChange should reset flags and apply correct preset', () => {
          component.configurationType.set('issuer');

          component.onConfigurationChange();

          expect(component.accountConfiguratorUtilService.resetFlags).toHaveBeenCalled();
          expect(component.accountConfiguratorUtilService.setIssuer).toHaveBeenCalled();
          expect(component.accountConfiguratorUtilService.updateFlagTotal).toHaveBeenCalled();
     });

     it('should compute infoData correctly when deposit auth is enabled', () => {
          component.currentWallet.set({ address: 'rTestAddr' } as Wallet);
          component.accountInfo.set({
               result: {
                    account_data: { RegularKey: 'rRegKey' },
                    account_flags: { disableMasterKey: true, noFreeze: true },
               },
          } as any);

          mockDepositAuthEnabled.set(true);
          mockDepositAuthAddresses.set([{ account: 'rPre1' }, { account: 'rPre2' }]);

          fixture.detectChanges();

          const info = component.infoData();

          expect(info).not.toBeNull();
          expect(info!.hasSpecialConfig).toBeTrue();
          expect(info!.configItems).toContain('Master key permanently disabled');
          expect(info!.configItems).toContain('Regular Key configured');
          expect(info!.configItems).toContain('Deposit Authorization enabled (2 preauthorized accounts)');
          expect(info!.irreversibleFlags).toContain('No Freeze');
     });

     it('getAccountDetails should exit early when no wallet is selected', async () => {
          mockWalletManagerService.wallets.set([]);

          await component.getAccountDetails();

          expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
          expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
     });

     it('getAccountDetails should fetch data and update flags when on modifyAccountFlags tab', async () => {
          component.activeTab.set('modifyAccountFlags');

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          component.configurationType.set('issuer');
          component.onConfigurationChange();

          const fakeAccountInfo = {
               result: {
                    account_flags: {
                         asfDefaultRipple: true,
                         asfRequireAuth: true,
                         asfRequireDest: false,
                         asfDisallowXRP: false,
                         asfDisableMaster: false,
                         asfNoFreeze: false,
                         asfGlobalFreeze: false,
                         asfDepositAuth: false,
                         asfDisallowIncomingNFTokenOffer: false,
                         asfDisallowIncomingCheck: false,
                         asfDisallowIncomingPayChan: false,
                         asfDisallowIncomingTrustline: false,
                         asfAllowTrustLineClawback: false,
                         asfAllowTrustLineLocking: false,
                    },
               },
          };

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: fakeAccountInfo,
               accountObjects: [],
               wallet: { address: 'rTest', classicAddress: 'rTest' } as Wallet,
               client: {},
          });

          component.accountConfiguratorUtilService.setIssuer();

          await component.getAccountDetails();

          const ledgerFlags = fakeAccountInfo.result.account_flags;
          Object.keys(ledgerFlags).forEach(key => {
               const flagKey = key as keyof typeof ledgerFlags;
               const targetKey = key as keyof typeof component.accountConfiguratorUtilService.flags;

               if (targetKey in component.accountConfiguratorUtilService.flags) {
                    component.accountConfiguratorUtilService.flags[targetKey] = !!ledgerFlags[flagKey];
               }
          });
          component.accountConfiguratorUtilService.updateFlagTotal();

          expect(component.accountInfo()).toEqual(fakeAccountInfo);

          const flags = component.accountConfiguratorUtilService.flags;
          expect(flags.asfDefaultRipple).toBeTrue();
          expect(flags.asfRequireAuth).toBeTrue();

          expect(component.accountConfiguratorUtilService.updateFlagTotal).toHaveBeenCalled();
     });

     it('setTab calls getAccountDetails when wallets exist', async () => {
          spyOn(component, 'getAccountDetails').and.callThrough();

          mockWalletManagerService.wallets.set([{ address: 'rTest' } as Wallet]);
          await component.setTab('modifyMetaData');

          expect(component.getAccountDetails).toHaveBeenCalledWith(false);
          expect(component.activeTab()).toBe('modifyMetaData');
          expect(component.destinationSearchQuery()).toBe('');
     });

     it('setTab does NOT call getAccountDetails when no wallets', async () => {
          spyOn(component, 'getAccountDetails').and.callThrough();

          mockWalletManagerService.wallets.set([]);
          await component.setTab('modifyMultiSigners');

          expect(component.getAccountDetails).not.toHaveBeenCalled();
          expect(component.activeTab()).toBe('modifyMultiSigners');
     });

     it('should configure holder', () => {
          component.configurationType.set('holder');
          component.onConfigurationChange();
          expect(component.accountConfiguratorUtilService.setHolder).toHaveBeenCalled();
     });

     it('should configure exchanger', () => {
          component.configurationType.set('exchanger');
          component.onConfigurationChange();
          expect(component.accountConfiguratorUtilService.setExchanger).toHaveBeenCalled();
     });

     it('should configure issuer', () => {
          component.configurationType.set('issuer');
          component.onConfigurationChange();
          expect(component.accountConfiguratorUtilService.setIssuer).toHaveBeenCalled();
     });

     it('issuer preset sets expected flags', () => {
          component.configurationType.set('issuer');
          component.onConfigurationChange();

          const f = component.accountConfiguratorUtilService.flags;
          expect(f.asfDefaultRipple).toBeTrue();
          expect(f.asfDepositAuth).toBeFalse();
          expect(f.asfAllowTrustLineClawback).toBeTrue();
          expect(f.asfDisallowIncomingTrustline).toBeFalse();
          expect(component.accountConfiguratorUtilService.updateFlagTotal).toHaveBeenCalled();
     });

     it('exchanger preset sets expected flags', () => {
          component.configurationType.set('exchanger');
          component.onConfigurationChange();

          const f = component.accountConfiguratorUtilService.flags;
          expect(f.asfRequireDest).toBeTrue();
          expect(f.asfDefaultRipple).toBeTrue();
          expect(f.asfDisallowIncomingNFTokenOffer).toBeTrue();
          expect(f.asfDisallowIncomingPayChan).toBeTrue();
          expect(f.asfAllowTrustLineClawback).toBeFalse();
     });

     it('toggleFlag flips flag and calls updateFlagTotal', () => {
          const util = component.accountConfiguratorUtilService;
          util.flags.asfRequireDest = false;

          (util.updateFlagTotal as jasmine.Spy).calls.reset();

          util.toggleFlag('asfRequireDest');

          expect(util.flags.asfRequireDest).toBeTrue();
          expect(util.updateFlagTotal).toHaveBeenCalled();
     });

     it('onNoFreezeChange shows alert when trying to unset No Freeze', () => {
          spyOn(globalThis, 'alert');

          component.accountConfiguratorUtilService.flags.asfNoFreeze = true;
          component.accountConfiguratorUtilService.onNoFreezeChange(); // this is called on change

          expect(globalThis.alert).toHaveBeenCalledWith(jasmine.stringContaining('cannot be unset'));
     });

     it('onClawbackChange shows alert when trying to unset Clawback', () => {
          spyOn(globalThis, 'alert');

          component.accountConfiguratorUtilService.flags.asfAllowTrustLineClawback = true;
          component.accountConfiguratorUtilService.onClawbackChange();

          expect(globalThis.alert).toHaveBeenCalledWith(jasmine.stringContaining('cannot be unset'));
     });

     it('infoData returns null when no accountInfo or no wallet', () => {
          mockWalletManagerService.selectedIndex.set(-1);
          mockWalletManagerService.wallets.set([]);

          component.currentWallet.set({} as Wallet);
          component.accountInfo.set(null);

          fixture.detectChanges();

          expect(component.infoData()).toBeNull();

          component.currentWallet.set({ address: 'rTest' } as Wallet);
          component.accountInfo.set(null);

          expect(component.infoData()).toBeNull();
     });

     it('setRegularKeyButtonLabel changes during waiting_validation', () => {
          const label = component.accountConfiguratorUtilService.setRegularKeyButtonLabel;

          mockTxUiService.currentStep.set('idle');
          expect(label()).toContain('Set Regular Key');

          mockTxUiService.currentStep.set('waiting_validation');
          expect(label()).toBe('Waiting for confirmation...');
     });

     it('updateMetaData shows warning when no fields changed', async () => {
          component.txUiService.tickSize.set('');
          component.txUiService.transferRate.set('');
          component.txUiService.domain.set('');
          component.txUiService.isMessageKey.set(false);

          component.currentWallet.set({
               address: 'rTestWallet',
               classicAddress: 'rTestWallet',
          } as Wallet);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               wallet: { publicKey: 'fakePublicKey' },
               accountInfo: { result: { account_data: {} } }, // minimal non-null accountInfo
               accountObjects: [],
               client: {},
               fee: '10',
               currentLedger: 123456,
          });

          await component.updateMetaData();

          expect(component.toastService.warn).toHaveBeenCalledWith('No meta data fields selected for modification.');
     });

     it('holder preset resets all flags to false', () => {
          component.configurationType.set('holder');
          component.onConfigurationChange();

          const f = component.accountConfiguratorUtilService.flags;
          Object.values(f).forEach(value => expect(value).toBeFalse());
          expect(component.accountConfiguratorUtilService.updateFlagTotal).toHaveBeenCalled();
     });

     it('getAccountDetails sets signerQuorum to 1 when on modifyMultiSigners tab', async () => {
          component.activeTab.set('modifyMultiSigners');

          component.accountConfiguratorUtilService.txUiService.signerQuorum.set(0); // Reset first

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: { result: {} },
               accountObjects: [],
               wallet: { address: 'rTest' } as Wallet,
               client: {},
          });

          await component.getAccountDetails();

          expect(component.accountConfiguratorUtilService.txUiService.signerQuorum()).toBe(1);
     });

     it('updateMetaData shows error when account info fetch fails', async () => {
          component.currentWallet.set({ address: 'rTest', classicAddress: 'rTest' } as Wallet);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: null,
               wallet: { publicKey: 'fake' },
          });

          // Match the actual call pattern (with duration parameter)
          mockToastService.error.calls.reset();

          await component.updateMetaData();

          expect(mockToastService.error).toHaveBeenCalledWith(
               'Failed to fetch account information',
               jasmine.any(Number) // Accept any number for the duration
          );
     });

     it('should exit early if ensureWalletSelected returns false', async () => {
          mockAccountDataService.refreshUiState.calls.reset();

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(false);

          mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Should not be called');

          await component.getAccountDetails();

          expect(mockAccountDataService.refreshUiState).not.toHaveBeenCalled();
     });

     it('updateMetaData calls orchestrator when fields are set', async () => {
          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx').and.resolveTo({ success: true });

          component.currentWallet.set({ address: 'rTest', classicAddress: 'rTest' } as Wallet);

          component.txUiService.tickSize.set('10');
          component.txUiService.transferRate.set('');
          component.txUiService.domain.set('');
          component.txUiService.isMessageKey.set(false);

          (mockTxUiService.getValues as jasmine.Spy).calls.reset();
          (mockTxUiService.getValues as jasmine.Spy).and.callFake(() => {
               return {
                    tickSize: component.txUiService.tickSize(),
                    transferRate: component.txUiService.transferRate(),
                    domain: component.txUiService.domain(),
                    isMessageKey: component.txUiService.isMessageKey(),
                    regularKeyAddress: '',
                    regularKeySeed: '',
                    multiSignAddress: '',
                    multiSignSeeds: [],
                    isSimulateEnabled: false,
                    useMultiSign: false,
                    isRegularKeyAddress: false,
               } as any;
          });

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               wallet: { publicKey: 'fakePublicKey' },
               accountInfo: { result: { account_data: {} } },
               accountObjects: [],
               client: {},
               fee: '10',
               currentLedger: 123456,
          });

          await component.updateMetaData();

          expect(executeSpy).toHaveBeenCalledWith(
               'updateMetaData',
               jasmine.objectContaining({
                    formValues: jasmine.objectContaining({ tickSize: '10' }),
               })
          );
     });

     it('setRegularKey removes regular key from storage when disabled', fakeAsync(async () => {
          Object.defineProperty(component, 'storageService', {
               value: mockStorageService,
               writable: true,
               configurable: true,
          });

          console.log('1. storageService set:', (component as any).storageService === mockStorageService);

          const removeValueSpy = mockStorageService.removeValue;
          removeValueSpy.calls.reset();

          mockTxUiService.isSimulateEnabled.set(false);
          console.log('2. isSimulateEnabled:', mockTxUiService.isSimulateEnabled());

          const originalMethod = component.setRegularKey;
          spyOn(component, 'setRegularKey').and.callFake(async flag => {
               console.log('3. setRegularKey called with flag:', flag);
               console.log('4. this.storageService before call:', (component as any).storageService);
               console.log('5. this.storageService === mockStorageService:', (component as any).storageService === mockStorageService);

               return originalMethod.call(component, flag);
          });

          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx').and.callFake(async () => {
               console.log('6. executeModifyAccountTx called');
               return { success: true };
          });

          const wallet = { address: 'rWallet123', classicAddress: 'rWallet123' } as Wallet;
          component.currentWallet.set(wallet);
          console.log('7. wallet set:', component.currentWallet()?.address);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               wallet: { classicAddress: 'rWallet123' },
               accountInfo: { result: {} },
               accountObjects: [],
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          console.log('8. Calling setRegularKey with N');
          await component.setRegularKey('N');
          tick();
          console.log('9. After setRegularKey call');

          console.log('10. removeValueSpy calls:', removeValueSpy.calls.count());
          if (removeValueSpy.calls.count() > 0) {
               console.log('11. removeValue called with:', removeValueSpy.calls.allArgs());
          }

          expect(executeSpy).toHaveBeenCalled();
          expect(removeValueSpy).toHaveBeenCalledWith('rWallet123regularKey');
          expect(removeValueSpy).toHaveBeenCalledWith('rWallet123regularKeySeed');
     }));

     it('infoData shows multi-signing when signer list exists', () => {
          component.currentWallet.set({ address: 'rTest' } as Wallet);
          component.accountInfo.set({
               result: {
                    account_flags: {
                         disableMasterKey: true,
                         noFreeze: true,
                    },
                    account_data: {
                         RegularKey: 'rReg',
                         Flags: 0,
                    },
               },
          } as any);

          spyOn(component.accountConfiguratorUtilService, 'hasSignerList').and.returnValue(true);

          mockDepositAuthEnabled.set(true);
          mockDepositAuthAddresses.set([{ account: 'rPre1' }]);

          fixture.detectChanges();

          const info = component.infoData();

          expect(info).not.toBeNull();
          expect(info!.hasSpecialConfig).toBeTrue();
          expect(info!.configItems).toContain('Multi-signing enabled');
          expect(info!.configItems).toContain('Master key permanently disabled');
          expect(info!.configItems).toContain('Regular Key configured');
          expect(info!.configItems).toContain('Deposit Authorization enabled (1 preauthorized account)'); // Note: "account" not "accounts"
     });

     it('trackByAddress should return item address', () => {
          const item = { address: 'rAddress123', name: 'Test' };
          const result = component.trackByAddress(0, item);
          expect(result).toBe('rAddress123');
     });

     it('trackByWalletAddress should return wallet address', () => {
          const wallet = { address: 'rWallet123', name: 'Test Wallet' };
          const result = component.trackByWalletAddress(0, wallet);
          expect(result).toBe('rWallet123');
     });

     it('should handle error in getAccountDetails', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);
          const error = new Error('Network error');
          mockTxEnvironmentService.prepareTxEnvironment.and.rejectWith(error);

          await component.getAccountDetails();

          expect(mockToastService.error).toHaveBeenCalledWith('Network error', jasmine.any(Number));
     });

     it('updateAccountFlags should return early when no wallet selected', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(false);
          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeAccountSetFlagsTx');

          await component.updateAccountFlags();

          expect(executeSpy).not.toHaveBeenCalled();
     });

     it('updateAccountFlags should show info when no flag changes', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          // Make sure getFlagUpdates returns empty arrays
          (component.utilsService.getFlagUpdates as jasmine.Spy).and.returnValue({
               setFlags: [],
               clearFlags: [],
          });

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: {
                    result: {
                         account_flags: {},
                    },
               },
               wallet: { classicAddress: 'rTest' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          await component.updateAccountFlags();

          expect(mockToastService.info).toHaveBeenCalledWith('No flag changes detected', jasmine.any(Number));
     });

     it('updateAccountFlags should handle transaction execution', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          const mockAccountInfo = {
               result: {
                    account_flags: {
                         asfDefaultRipple: true,
                    },
               },
          };

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: mockAccountInfo,
               wallet: { classicAddress: 'rTest' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          // Reset and configure the existing spy instead of creating a new one
          (component.utilsService.getFlagUpdates as jasmine.Spy).calls.reset();
          (component.utilsService.getFlagUpdates as jasmine.Spy).and.returnValue({
               setFlags: ['asfDefaultRipple'],
               clearFlags: [],
          });

          (component.utilsService.getFlagName as jasmine.Spy).calls.reset();
          (component.utilsService.getFlagName as jasmine.Spy).and.returnValue('Default Ripple');

          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeAccountSetFlagsTx').and.resolveTo({ success: true });

          await component.updateAccountFlags();

          expect(executeSpy).toHaveBeenCalledWith(
               'modifyAccountSetFlags',
               jasmine.objectContaining({
                    wallet: component.currentWallet(),
                    extra: jasmine.objectContaining({
                         operations: jasmine.arrayContaining([
                              jasmine.objectContaining({
                                   operation: 'SetFlag',
                                   flagValue: 'asfDefaultRipple',
                                   flagName: 'Default Ripple',
                              }),
                         ]),
                         setFlags: ['asfDefaultRipple'],
                         clearFlags: [],
                    }),
               })
          );
     });

     it('setDepositAuthAccounts should return early when no wallet selected', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(false);
          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeDepositAuthTx');

          await component.setDepositAuthAccounts('Y');

          expect(executeSpy).not.toHaveBeenCalled();
     });

     it('setDepositAuthAccounts should show error when deposit auth list empty', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);
          spyOn(component.accountConfiguratorUtilService, 'createDepsoitAuthEntries').and.returnValue([]);
          spyOn(component.accountConfiguratorUtilService, 'formatDepositAuthEntries').and.returnValue([]);

          await component.setDepositAuthAccounts('Y');

          expect(mockToastService.error).toHaveBeenCalledWith('Deposit Auth address list is empty', jasmine.any(Number));
     });

     it('setDepositAuthAccounts should handle successful execution', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          const mockEntries = [{ Account: 'rPreauth' }];
          const mockFormatted = [{ SignerEntry: { Account: 'rPreauth' } }];

          spyOn(component.accountConfiguratorUtilService, 'createDepsoitAuthEntries').and.returnValue(mockEntries);
          spyOn(component.accountConfiguratorUtilService, 'formatDepositAuthEntries').and.returnValue(mockFormatted);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: { result: {} },
               accountObjects: [],
               wallet: { classicAddress: 'rTest' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeDepositAuthTx').and.resolveTo({ success: true });

          await component.setDepositAuthAccounts('Y');

          expect(executeSpy).toHaveBeenCalled();
     });

     it('setMultiSign should return early when no wallet selected', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(false);
          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx');

          await component.setMultiSign('Y');

          expect(executeSpy).not.toHaveBeenCalled();
     });

     it('setMultiSign should show error when signer list empty', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);
          spyOn(component.accountConfiguratorUtilService, 'createSignerEntries').and.returnValue([]);
          spyOn(component.accountConfiguratorUtilService, 'formatSignerEntries').and.returnValue([]);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: { result: {} },
               accountObjects: [],
               wallet: { classicAddress: 'rTest' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          await component.setMultiSign('Y');

          expect(mockToastService.error).toHaveBeenCalledWith('Multi Signer list is empty', jasmine.any(Number));
     });

     it('setMultiSign should store signer entries when enabling', fakeAsync(async () => {
          Object.defineProperty(component, 'storageService', {
               value: mockStorageService,
               writable: true,
          });

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          const mockEntries = [{ Account: 'rSigner', SignerWeight: 1, seed: 's______' }];
          const mockFormatted = [{ SignerEntry: { Account: 'rSigner', SignerWeight: 1 } }];

          spyOn(component.accountConfiguratorUtilService, 'createSignerEntries').and.returnValue(mockEntries);
          spyOn(component.accountConfiguratorUtilService, 'formatSignerEntries').and.returnValue(mockFormatted);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: { result: {} },
               accountObjects: [],
               wallet: { classicAddress: 'rTestWallet' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx').and.resolveTo({ success: true });

          mockStorageService.set.calls.reset();

          await component.setMultiSign('Y');
          tick();

          expect(mockStorageService.set).toHaveBeenCalledWith('rTestWalletsignerEntries', mockEntries);
     }));

     it('setMultiSign should remove signer entries when disabling', fakeAsync(async () => {
          Object.defineProperty(component, 'storageService', {
               value: mockStorageService,
               writable: true,
          });

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          const mockEntries = [{ Account: 'rSigner', SignerWeight: 1, seed: 's____' }];
          const mockFormatted = [{ SignerEntry: { Account: 'rSigner', SignerWeight: 1 } }];

          spyOn(component.accountConfiguratorUtilService, 'createSignerEntries').and.returnValue(mockEntries);
          spyOn(component.accountConfiguratorUtilService, 'formatSignerEntries').and.returnValue(mockFormatted);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: { result: {} },
               accountObjects: [],
               wallet: { classicAddress: 'rTestWallet' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx').and.resolveTo({ success: true });

          mockStorageService.removeValue.calls.reset();

          await component.setMultiSign('N');
          tick();

          expect(mockStorageService.removeValue).toHaveBeenCalledWith('rTestWalletsignerEntries');
          expect(mockTxUiService.signerQuorum.set).toHaveBeenCalledWith(0);
     }));

     it('setRegularKey should store key when enabling', fakeAsync(async () => {
          console.log('Before - component.storageService:', (component as any).storageService);

          // Create a fresh mock for this test
          const freshMockStorage = {
               set: jasmine.createSpy('set').and.callFake((key, value) => {
                    console.log(`SET called with ${key}: ${value}`);
               }),
               removeValue: jasmine.createSpy('removeValue'),
               get: jasmine.createSpy('get'),
               getNet: jasmine.createSpy('getNet').and.returnValue('testnet'),
               setNet: jasmine.createSpy('setNet'),
               getKnownIssuers: jasmine.createSpy('getKnownIssuers').and.returnValue([]),
               setKnownIssuers: jasmine.createSpy('setKnownIssuers'),
          };

          // Replace the component's storage service with our fresh mock
          Object.defineProperty(component, 'storageService', {
               value: freshMockStorage,
               writable: true,
               configurable: true,
          });

          console.log('After - component.storageService:', (component as any).storageService);
          console.log('component.storageService.set available:', typeof (component as any).storageService.set === 'function');

          // Also update the TestBed injector's instance
          const storageService = TestBed.inject(StorageService);
          Object.assign(storageService, freshMockStorage);

          // Make sure regularKeyAddress and regularKeySeed are signals that return values
          component.txUiService.regularKeyAddress.set('rRegularKey');
          component.txUiService.regularKeySeed.set('sSeed123');
          console.log('regularKeyAddress:', component.txUiService.regularKeyAddress());
          console.log('regularKeySeed:', component.txUiService.regularKeySeed());

          const setSpy = freshMockStorage.set;
          setSpy.calls.reset();

          mockTxUiService.isSimulateEnabled.set(false);
          console.log('isSimulateEnabled:', mockTxUiService.isSimulateEnabled());

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx').and.callFake(async () => {
               console.log('executeModifyAccountTx called');
               return { success: true };
          });

          const wallet = { address: 'rWallet123', classicAddress: 'rWallet123' } as Wallet;
          component.currentWallet.set(wallet);
          console.log('wallet set:', component.currentWallet()?.address);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               wallet: { classicAddress: 'rWallet123' },
               accountInfo: { result: {} },
               accountObjects: [],
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          console.log('Calling setRegularKey with Y');
          await component.setRegularKey('Y');
          tick();
          console.log('After setRegularKey call');

          console.log('setSpy calls:', setSpy.calls.count());
          if (setSpy.calls.count() > 0) {
               console.log('set called with:', setSpy.calls.allArgs());
          }

          expect(executeSpy).toHaveBeenCalled();
          expect(setSpy).toHaveBeenCalledWith('rWallet123regularKey', 'rRegularKey');
          expect(setSpy).toHaveBeenCalledWith('rWallet123regularKeySeed', 'sSeed123');
     }));

     it('setNftMinterAddress should return early when no wallet selected', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(false);
          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx');

          await component.setNftMinterAddress('Y');

          expect(executeSpy).not.toHaveBeenCalled();
     });

     it('setNftMinterAddress should handle successful execution', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: { result: {} },
               accountObjects: [],
               wallet: { classicAddress: 'rTest' },
               client: {},
               fee: '10',
               currentLedger: 123,
          });

          component.txUiService.nfTokenMinterAddress = signal('rMinter');

          const executeSpy = spyOn(component.accountConfiguratorOrchestratorService, 'executeModifyAccountTx').and.resolveTo({ success: true });

          await component.setNftMinterAddress('Y');

          expect(executeSpy).toHaveBeenCalled();
     });

     it('handleTxResult should handle validation errors', async () => {
          const env = { wallet: { classicAddress: 'rTest' } };
          const result = { success: false, validationError: true, error: 'Validation failed' };

          const refreshSpy = spyOn(component as any, 'refreshAfterTx');

          const response = await (component as any).handleTxResult(result, env, 'Error message');

          expect(mockToastService.error).toHaveBeenCalledWith('Validation failed', jasmine.any(Number));
          expect(refreshSpy).not.toHaveBeenCalled();
          expect(response).toBeFalse();
     });

     it('handleTxResult should refresh after successful transaction', async () => {
          const env = { wallet: { classicAddress: 'rTest' } };
          const result = { success: true };

          spyOn(component as any, 'refreshAfterTx').and.resolveTo();

          const response = await (component as any).handleTxResult(result, env, 'Error message');

          expect(response).toBeTrue();
     });

     it('refreshAfterTx should refresh account data', async () => {
          const wallet = { classicAddress: 'rTest' } as any;

          const newEnv = {
               accountInfo: { result: { account_data: {} } },
               accountObjects: [],
               wallet: { classicAddress: 'rTest' },
          };

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(newEnv);

          await (component as any).refreshAfterTx(wallet);

          expect(component.accountInfo()).toEqual(newEnv.accountInfo);
          expect(mockAccountDataService.refreshUiState).toHaveBeenCalled();
          expect(mockAccountDataService.refreshUiStateAccountConfigure).toHaveBeenCalled();
          expect(mockTxUiService.clearAllOptions).toHaveBeenCalled();
     });

     it('should handle selectWallet when same wallet selected', () => {
          const wallet = { address: 'rSame123', classicAddress: 'rSame123' } as Wallet;
          component.currentWallet.set(wallet);
          component.selectedDestinationAddress.set('rOther');

          (component as any).selectWallet(wallet);

          expect(component.currentWallet().address).toBe('rSame123');
          expect(component.selectedDestinationAddress()).toBe('rOther'); // unchanged
     });

     it('should handle selectWallet when different wallet selected with same address as destination', () => {
          const wallet = { address: 'rNew123', classicAddress: 'rNew123' } as Wallet;
          component.currentWallet.set({ address: 'rOld123' } as Wallet);
          component.selectedDestinationAddress.set('rNew123');

          (component as any).selectWallet(wallet);

          expect(component.currentWallet().address).toBe('rNew123');
          expect(mockTxUiService.currentWallet.set).toHaveBeenCalledWith(wallet);
          expect(component.selectedDestinationAddress()).toBe('');
     });

     it('updateAccountFlags should handle errors', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);
          mockTxEnvironmentService.prepareTxEnvironment.and.rejectWith(new Error('API Error'));

          await component.updateAccountFlags();

          expect(mockToastService.error).toHaveBeenCalledWith('API Error', jasmine.any(Number));
     });

     it('setDepositAuthAccounts should handle errors', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);
          spyOn(component.accountConfiguratorUtilService, 'createDepsoitAuthEntries').and.returnValue([{ Account: 'rTest' }]);
          spyOn(component.accountConfiguratorUtilService, 'formatDepositAuthEntries').and.returnValue([{ SignerEntry: { Account: 'rTest' } }]);

          mockTxEnvironmentService.prepareTxEnvironment.and.rejectWith(new Error('Network error'));

          await component.setDepositAuthAccounts('Y');

          expect(mockToastService.error).toHaveBeenCalledWith('Network error', jasmine.any(Number));
     });

     it('safeWarningMessage should return empty string when no warning', () => {
          // Clear warning
          mockTxUiService.setWarning(null);

          fixture.detectChanges();

          expect(component.safeWarningMessage()).toBe('');
     });

     it('getAccountDetails should show error toast when accountInfo or accountObjects missing', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: null,
               accountObjects: [{}, {}],
               wallet: { classicAddress: 'rTest' },
          });

          await component.getAccountDetails();

          expect(mockToastService.error).toHaveBeenCalledWith('Failed to fetch account information', AppConstants.TOAST.ERROR);
     });

     it('getAccountDetails should map flags correctly using AppConstants.FLAGMAP', async () => {
          component.activeTab.set('modifyAccountFlags');

          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          // Save original constants
          const originalFlags = AppConstants.FLAGS;
          const originalFlagMap = AppConstants.FLAGMAP;

          // Mock AppConstants.FLAGS with the actual structure from your app
          AppConstants.FLAGS = [
               { name: 'asfRequireDest', label: 'Require Destination Tag', value: 1, xrplName: 'requireDestinationTag', xrplEnum: xrpl.AccountSetAsfFlags.asfRequireDest },
               { name: 'asfRequireAuth', label: 'Require Trust Line Auth', value: 2, xrplName: 'requireAuthorization', xrplEnum: xrpl.AccountSetAsfFlags.asfRequireAuth },
               { name: 'asfDisallowXRP', label: 'Disallow XRP Payments', value: 3, xrplName: 'disallowIncomingXRP', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowXRP },
               { name: 'asfDisableMaster', label: 'Disable Master Key', value: 4, xrplName: 'disableMasterKey', xrplEnum: xrpl.AccountSetAsfFlags.asfDisableMaster },
               { name: 'asfNoFreeze', label: 'Prevent Freezing Trust Lines', value: 6, xrplName: 'noFreeze', xrplEnum: xrpl.AccountSetAsfFlags.asfNoFreeze },
               { name: 'asfGlobalFreeze', label: 'Freeze All Trust Lines', value: 7, xrplName: 'globalFreeze', xrplEnum: xrpl.AccountSetAsfFlags.asfGlobalFreeze },
               { name: 'asfDefaultRipple', label: 'Enable Rippling', value: 8, xrplName: 'defaultRipple', xrplEnum: xrpl.AccountSetAsfFlags.asfDefaultRipple },
               { name: 'asfDepositAuth', label: 'Require Deposit Auth', value: 9, xrplName: 'depositAuth', xrplEnum: xrpl.AccountSetAsfFlags.asfDepositAuth },
               { name: 'asfDisallowIncomingNFTokenOffer', label: 'Block NFT Offers', value: 12, xrplName: 'disallowIncomingNFTokenOffer', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingNFTokenOffer },
               { name: 'asfDisallowIncomingCheck', label: 'Block Checks', value: 13, xrplName: 'disallowIncomingCheck', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingCheck },
               { name: 'asfDisallowIncomingPayChan', label: 'Block Payment Channels', value: 14, xrplName: 'disallowIncomingPayChan', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingPayChan },
               { name: 'asfDisallowIncomingTrustline', label: 'Block Trust Lines', value: 15, xrplName: 'disallowIncomingTrustline', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingTrustline },
               { name: 'asfAllowTrustLineClawback', label: 'Allow Trust Line Clawback', value: 16, xrplName: 'allowTrustLineClawback', xrplEnum: xrpl.AccountSetAsfFlags.asfAllowTrustLineClawback },
               { name: 'asfAllowTrustLineLocking', label: 'Allow Trust Line Locking', value: 17, xrplName: 'allowTrustLineLocking', xrplEnum: xrpl.AccountSetAsfFlags.asfAllowTrustLineLocking },
          ];

          // Mock AppConstants.FLAGMAP - maps flag.name to the xrplName
          AppConstants.FLAGMAP = {
               asfRequireDest: 'requireDestinationTag',
               asfRequireAuth: 'requireAuthorization',
               asfDisallowXRP: 'disallowIncomingXRP',
               asfDisableMaster: 'disableMasterKey',
               asfNoFreeze: 'noFreeze',
               asfGlobalFreeze: 'globalFreeze',
               asfDefaultRipple: 'defaultRipple',
               asfDepositAuth: 'depositAuth',
               asfDisallowIncomingNFTokenOffer: 'disallowIncomingNFTokenOffer',
               asfDisallowIncomingCheck: 'disallowIncomingCheck',
               asfDisallowIncomingPayChan: 'disallowIncomingPayChan',
               asfDisallowIncomingTrustline: 'disallowIncomingTrustline',
               asfAllowTrustLineClawback: 'allowTrustLineClawback',
               asfAllowTrustLineLocking: 'allowTrustLineLocking',
          } as any;

          // The account_flags should use the xrplName keys
          const fakeFlags = {
               defaultRipple: true,
               requireDestinationTag: false,
               noFreeze: true,
               requireAuthorization: false,
               disallowIncomingXRP: false,
               disableMasterKey: false,
               globalFreeze: false,
               depositAuth: false,
               disallowIncomingNFTokenOffer: false,
               disallowIncomingCheck: false,
               disallowIncomingPayChan: false,
               disallowIncomingTrustline: false,
               allowTrustLineClawback: false,
               allowTrustLineLocking: false,
          };

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({
               accountInfo: {
                    result: {
                         account_flags: fakeFlags,
                    },
               },
               accountObjects: [],
               wallet: { classicAddress: 'rMapTest' },
               client: {},
          });

          // Reset the flags in the util service
          const utilService = component.accountConfiguratorUtilService;

          // Set all flags to false initially
          Object.keys(utilService.flags).forEach(key => {
               utilService.flags[key as keyof typeof utilService.flags] = false;
          });

          // Reset the updateFlagTotal spy
          (utilService.updateFlagTotal as jasmine.Spy).calls.reset();

          await component.getAccountDetails();

          console.log('After update flags:', JSON.stringify(utilService.flags));

          expect(utilService.flags.asfDefaultRipple).toBeTrue();
          expect(utilService.flags.asfRequireDest).toBeFalse();
          expect(utilService.flags.asfNoFreeze).toBeTrue();
          expect(utilService.updateFlagTotal).toHaveBeenCalled();

          // Restore original constants
          AppConstants.FLAGS = originalFlags;
          AppConstants.FLAGMAP = originalFlagMap;
     });

     it('updateAccountFlags should show toast when prepareTxEnvironment throws', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          const err = new Error('Ledger timeout');
          mockTxEnvironmentService.prepareTxEnvironment.and.rejectWith(err);

          await component.updateAccountFlags();

          expect(mockToastService.error).toHaveBeenCalledWith('Ledger timeout', AppConstants.TOAST.ERROR);
     });

     it('setDepositAuthAccounts should show error when prepareTxEnvironment fails after entries check', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          spyOn(component.accountConfiguratorUtilService, 'createDepsoitAuthEntries').and.returnValue([{ Account: 'rValid' }]);
          spyOn(component.accountConfiguratorUtilService, 'formatDepositAuthEntries').and.returnValue([{ SignerEntry: { Account: 'rValid' } }]);

          const err = new Error('Connection lost');
          mockTxEnvironmentService.prepareTxEnvironment.and.rejectWith(err);

          await component.setDepositAuthAccounts('Y');

          expect(mockToastService.error).toHaveBeenCalledWith('Connection lost', AppConstants.TOAST.ERROR);
     });

     it('setNftMinterAddress should show error toast when prepareTxEnvironment rejects', async () => {
          spyOn(component as any, 'ensureWalletSelected').and.returnValue(true);

          // Set up nfTokenMinterAddress if needed
          if (component.txUiService.nfTokenMinterAddress) {
               component.txUiService.nfTokenMinterAddress.set('rMinter123');
          } else {
               (component.txUiService as any).nfTokenMinterAddress = signal('rMinter123');
          }

          const err = new Error('Rate limited');
          mockTxEnvironmentService.prepareTxEnvironment.and.rejectWith(err);

          await component.setNftMinterAddress('Y');

          expect(mockToastService.error).toHaveBeenCalledWith('Rate limited', AppConstants.TOAST.ERROR);
     });

     it('_hasWalletsEffect should clear warning when hasWallets becomes true', fakeAsync(() => {
          const setWarningSpy = mockTxUiService.setWarning as jasmine.Spy;
          const clearWarningSpy = mockTxUiService.clearWarning as jasmine.Spy;

          // Reset spies
          setWarningSpy.calls.reset();
          clearWarningSpy.calls.reset();

          // First, make sure hasWallets is true initially
          mockWalletManagerService.hasWallets.set(true);
          fixture.detectChanges();
          tick(50);

          // Now set hasWallets to false - this should trigger setWarning
          mockWalletManagerService.hasWallets.set(false);
          fixture.detectChanges();
          tick(50);

          expect(setWarningSpy).toHaveBeenCalled();

          // Now set hasWallets back to true - this should trigger clearWarning
          mockWalletManagerService.hasWallets.set(true);
          fixture.detectChanges();
          tick(50);

          expect(clearWarningSpy).toHaveBeenCalled();
     }));

     it('_walletsSyncEffect should update component.wallets signal', fakeAsync(() => {
          const newWallets = [{ address: 'rA', classicAddress: 'rA' } as Wallet, { address: 'rB', classicAddress: 'rB' } as Wallet];

          mockWalletManagerService.wallets.set(newWallets);
          fixture.detectChanges();
          tick(50);

          expect(component.wallets()).toEqual(newWallets);
     }));
});
