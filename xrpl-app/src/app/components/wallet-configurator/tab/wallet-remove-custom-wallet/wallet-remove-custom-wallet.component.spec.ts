import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { signal, Component } from '@angular/core';
import { WalletRemoveCustomWalletComponent } from './wallet-remove-custom-wallet.component';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { WalletDataService } from '../../../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../../../services/account-data/acccount-data.service';
import { StorageService } from '../../../../services/shared/local-storage/storage.service';

// Mock child components
@Component({ selector: 'app-select-search-dropdown', template: '<div></div>', standalone: true })
class MockSelectSearchDropdown {}

describe('WalletRemoveCustomWalletComponent', () => {
     let component: WalletRemoveCustomWalletComponent;
     let fixture: ComponentFixture<WalletRemoveCustomWalletComponent>;
     let walletsStoreMock: any;
     let walletsViewModelMock: any;
     let transactionDropdownMock: any;
     let walletsUtilMock: any;
     let walletConfiguratorMock: any;
     let walletManagerMock: any;
     let transactionUiMock: any;
     let walletDataMock: any;
     let txEnvironmentMock: any;
     let copyUtilMock: any;
     let toastMock: any;
     let accountDataMock: any;
     let storageMock: any;
     let activatedRouteMock: any;

     const mockCustomWallets = [
          { address: 'rABC123', name: 'Test Wallet 1' },
          { address: 'rXYZ789', name: 'Test Wallet 2' },
     ];

     beforeEach(async () => {
          walletsStoreMock = {
               selectedAddress: signal<string | null>(null),
               setField: jasmine.createSpy('setField').and.callFake((key: string, value: any) => {
                    if (key === 'selectedAddress') {
                         walletsStoreMock.selectedAddress.set(value);
                    }
               }),
               buttonLoading: jasmine.createSpy('buttonLoading').and.returnValue({
                    deriveWalletFromSecretNumbers: false,
               }),
          };

          walletsViewModelMock = {
               activeTab: signal('removeCustomWallets'),
          };

          transactionDropdownMock = {
               customDestinations: signal(mockCustomWallets),
               allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
               destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
               destinationItems: jasmine.createSpy('destinationItems').and.returnValue(signal([])),
               selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
               filteredDestinations: jasmine.createSpy('filteredDestinations').and.returnValue(signal([])),
               destinationDisplay: jasmine.createSpy('destinationDisplay').and.returnValue(signal('')),
               setupAutoSelectOnValidTypedAddress: jasmine.createSpy('setupAutoSelectOnValidTypedAddress'),
               loadCustomDestinations: jasmine.createSpy('loadCustomDestinations'),
               getFinalDestinationAddress: jasmine.createSpy('getFinalDestinationAddress').and.returnValue(''),
          };

          walletsUtilMock = {
               truncateAddress: jasmine.createSpy('truncateAddress').and.callFake((addr: string) => {
                    return addr.slice(0, 6) + '...';
               }),
          };

          walletConfiguratorMock = {
               removeCustomWallet: jasmine.createSpy('removeCustomWallet'),
          };

          walletManagerMock = {
               wallets: signal([]),
               selectedIndex: signal(0),
               hasWallets: signal(false),
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(null),
               ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
          };

          transactionUiMock = {
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               wantsOptions: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               setWarning: jasmine.createSpy('setWarning'),
               setError: jasmine.createSpy('setError'),
               setInfoMessage: jasmine.createSpy('setInfoMessage'),
               clearWarning: jasmine.createSpy('clearWarning'),
               clearMessages: jasmine.createSpy('clearMessages'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               currentStep: signal('idle'),
               txResultSignal: signal(null),
               warningMessage: '',
               errorMessage: '',
               infoMessage: '',
          };

          walletDataMock = { refreshWallets: jasmine.createSpy('refreshWallets') };
          txEnvironmentMock = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironmentWithWallet']);
          copyUtilMock = { copyAddress: jasmine.createSpy('copyAddress') };
          toastMock = { error: jasmine.createSpy('error'), success: jasmine.createSpy('success') };
          accountDataMock = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);
          storageMock = { getItem: jasmine.createSpy('getItem'), setItem: jasmine.createSpy('setItem'), getNet: jasmine.createSpy('getNet').and.returnValue('devnet') };
          activatedRouteMock = { snapshot: {} };

          await TestBed.configureTestingModule({
               imports: [WalletRemoveCustomWalletComponent],
               providers: [
                    provideNoopAnimations(),
                    { provide: ActivatedRoute, useValue: activatedRouteMock },
                    { provide: WalletConfiguratorComponent, useValue: walletConfiguratorMock },
                    { provide: WalletsStoreService, useValue: walletsStoreMock },
                    { provide: WalletsViewModelService, useValue: walletsViewModelMock },
                    { provide: TransactionDropdownService, useValue: transactionDropdownMock },
                    { provide: WalletsUtilService, useValue: walletsUtilMock },
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: transactionUiMock },
                    { provide: WalletDataService, useValue: walletDataMock },
                    { provide: TxEnvironmentService, useValue: txEnvironmentMock },
                    { provide: CopyUtilService, useValue: copyUtilMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: AcccountDataService, useValue: accountDataMock },
                    { provide: StorageService, useValue: storageMock },
               ],
          })
               .overrideComponent(WalletRemoveCustomWalletComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(WalletRemoveCustomWalletComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          if (walletConfiguratorMock.removeCustomWallet) {
               walletConfiguratorMock.removeCustomWallet.calls.reset();
          }
          if (walletsStoreMock.setField) {
               walletsStoreMock.setField.calls.reset();
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onCustomWalletSelected', () => {
          beforeEach(() => {
               spyOn(console, 'log');
               spyOn(console, 'warn');
          });

          it('should extract address from string event', () => {
               walletsStoreMock.setField.calls.reset();
               const event = 'rABC123';
               component.onCustomWalletSelected(event);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('selectedAddress', 'rABC123');
          });

          it('should extract address from object event with id property', () => {
               walletsStoreMock.setField.calls.reset();
               const event = { id: 'rABC123' };
               component.onCustomWalletSelected(event);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('selectedAddress', 'rABC123');
          });

          it('should extract address from object event with address property', () => {
               walletsStoreMock.setField.calls.reset();
               const event = { address: 'rABC123' };
               component.onCustomWalletSelected(event);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('selectedAddress', 'rABC123');
          });

          it('should extract address from object event with value property', () => {
               walletsStoreMock.setField.calls.reset();
               const event = { value: 'rABC123' };
               component.onCustomWalletSelected(event);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('selectedAddress', 'rABC123');
          });

          it('should handle null event', () => {
               walletsStoreMock.setField.calls.reset();
               component.onCustomWalletSelected(null);
               expect(walletsStoreMock.setField).not.toHaveBeenCalled();
          });

          it('should handle undefined event', () => {
               walletsStoreMock.setField.calls.reset();
               component.onCustomWalletSelected(undefined);
               expect(walletsStoreMock.setField).not.toHaveBeenCalled();
          });

          it('should trim whitespace from address', () => {
               walletsStoreMock.setField.calls.reset();
               const event = { id: '  rABC123  ' };
               component.onCustomWalletSelected(event);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('selectedAddress', 'rABC123');
          });
     });

     describe('customOnlyItems computed', () => {
          it('should map custom destinations to dropdown items', () => {
               transactionDropdownMock.customDestinations.set(mockCustomWallets);
               const items = component.customOnlyItems();
               expect(items.length).toBe(2);
               expect(items[0]).toEqual({
                    id: 'rABC123',
                    display: 'Test Wallet 1 (rABC12...)',
                    name: 'Test Wallet 1',
                    address: 'rABC123',
               });
          });

          it('should return empty array when no custom destinations', () => {
               transactionDropdownMock.customDestinations.set([]);
               const items = component.customOnlyItems();
               expect(items).toEqual([]);
          });
     });

     describe('selectedCustomItem computed', () => {
          it('should return null when no address selected', () => {
               walletsStoreMock.selectedAddress.set(null);
               const item = component.selectedCustomItem();
               expect(item).toBeNull();
          });

          it('should return custom item when address matches custom destination', () => {
               walletsStoreMock.selectedAddress.set('rABC123');
               const item = component.selectedCustomItem();
               expect(item).toEqual({
                    id: 'rABC123',
                    name: 'Test Wallet 1',
                    display: 'Test Wallet 1',
                    address: 'rABC123',
               });
          });

          it('should return item with truncated address when address not in custom list', () => {
               walletsStoreMock.selectedAddress.set('rUNKNOWN123');
               walletsUtilMock.truncateAddress.and.returnValue('rUNKNO...');
               const item = component.selectedCustomItem();
               expect(item).toEqual({
                    id: 'rUNKNOWN123',
                    name: 'rUNKNO...',
                    display: 'rUNKNO...',
                    address: 'rUNKNOWN123',
               });
          });
     });

     describe('confirmRemoveWallet', () => {
          beforeEach(() => {
               spyOn(window, 'confirm');
          });

          it('should call removeCustomWallet when confirmed', () => {
               walletsStoreMock.selectedAddress.set('rABC123');
               (window.confirm as jasmine.Spy).and.returnValue(true);
               walletConfiguratorMock.removeCustomWallet.calls.reset();

               component.confirmRemoveWallet();

               expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove wallet rABC123? This action cannot be undone.');
               expect(walletConfiguratorMock.removeCustomWallet).toHaveBeenCalled();
          });

          it('should not call removeCustomWallet when cancelled', () => {
               walletsStoreMock.selectedAddress.set('rABC123');
               (window.confirm as jasmine.Spy).and.returnValue(false);
               walletConfiguratorMock.removeCustomWallet.calls.reset();

               component.confirmRemoveWallet();

               expect(window.confirm).toHaveBeenCalled();
               expect(walletConfiguratorMock.removeCustomWallet).not.toHaveBeenCalled();
          });
     });

     describe('Protected methods (overridden)', () => {
          it('should have onSelectedWalletIndexChange as no-op', async () => {
               await (component as any).onSelectedWalletIndexChange();
               expect(true).toBeTrue();
          });

          it('should have refreshAccountObject as no-op', async () => {
               await (component as any).refreshAccountObject({});
               expect(true).toBeTrue();
          });

          it('should have clearInputFields as no-op', () => {
               (component as any).clearInputFields();
               expect(true).toBeTrue();
          });
     });

     describe('Service injections', () => {
          it('should have walletsStoreService injected', () => {
               expect(component.walletsStoreService).toBe(walletsStoreMock);
          });

          it('should have walletsViewModelService injected', () => {
               expect(component.walletsViewModelService).toBe(walletsViewModelMock);
          });

          it('should have WalletConfiguratorComponent injected', () => {
               expect(component.WalletConfiguratorComponent).toBe(walletConfiguratorMock);
          });
     });

     describe('typedDestination signal', () => {
          it('should initialize with empty string', () => {
               expect(component.typedDestination()).toBe('');
          });

          it('should update typedDestination', () => {
               component.typedDestination.set('test');
               expect(component.typedDestination()).toBe('test');
          });
     });
});
