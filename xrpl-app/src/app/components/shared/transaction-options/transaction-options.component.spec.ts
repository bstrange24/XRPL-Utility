import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { TransactionOptionsComponent } from './transaction-options.component';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { WalletManagerService } from '../../../services/wallets/manager/wallet-manager.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('TransactionOptionsComponent', () => {
     let component: TransactionOptionsComponent;
     let fixture: ComponentFixture<TransactionOptionsComponent>;

     // Services
     let txUiService: any;
     let utilsService: any;
     let xrplTxOptionsStore: any;
     let accountConfiguratorStoreService: any;
     let walletManagerService: any;

     beforeEach(async () => {
          txUiService = {
               toggleSimulate: jasmine.createSpy('toggleSimulate'),
          };

          utilsService = {
               toggleMultiSign: jasmine.createSpy('toggleMultiSign'),
               adjustTextareaHeight: jasmine.createSpy('adjustTextareaHeight'),
          };

          xrplTxOptionsStore = {
               isMemoEnabled: signal(false),
               useMultiSign: signal(false),
               isRegularKeyAddress: signal(false),
               isTicket: signal(false),
               isSimulateEnabled: signal(false),
               memos: signal([]),
               ticketArray: signal([]),
               selectedSingleTicket: signal(''),
               selectedTickets: signal([]),
               multiSelectMode: signal(false),
               setField: jasmine.createSpy('setField'),
               addMemo: jasmine.createSpy('addMemo'),
               updateMemos: jasmine.createSpy('updateMemos'),
               toggleMemo: jasmine.createSpy('toggleMemo'),
               clearMemos: jasmine.createSpy('clearMemos'),
          };

          accountConfiguratorStoreService = {
               multiSignAddress: signal(''),
               multiSignSeeds: signal(''),
               signerQuorum: signal(0),
               signers: signal([]),
               regularKeyAddress: signal(''),
               regularKeySeed: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          walletManagerService = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue({ classicAddress: 'rTestAddress' }),
          };

          await TestBed.configureTestingModule({
               imports: [TransactionOptionsComponent],
               providers: [
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(TransactionOptionsComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('activeTab', () => 'createMpt');
          fixture.componentRef.setInput('showWhenTab', '*');
          fixture.componentRef.setInput('multiSigningEnabled', false);
          fixture.componentRef.setInput('regularKeySigningEnabled', false);
          fixture.componentRef.setInput('showMemo', true);
          fixture.componentRef.setInput('showMultiSign', true);
          fixture.componentRef.setInput('showRegularKey', true);
          fixture.componentRef.setInput('showTicket', true);
          fixture.componentRef.setInput('showSimulate', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset spies
          Object.keys(xrplTxOptionsStore.setField.calls).forEach(() => xrplTxOptionsStore.setField.calls.reset());
          if (utilsService.toggleMultiSign) utilsService.toggleMultiSign.calls.reset();
          if (txUiService.toggleSimulate) txUiService.toggleSimulate.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          // it('should accept activeTab input', () => {
          //      expect(component.activeTab()()).toBe('createMpt');
          // });

          it('should accept showWhenTab input', () => {
               expect(component.showWhenTab()).toBe('*');
          });

          it('should accept multiSigningEnabled input', () => {
               expect(component.multiSigningEnabled()).toBeFalse();
          });

          it('should accept regularKeySigningEnabled input', () => {
               expect(component.regularKeySigningEnabled()).toBeFalse();
          });

          it('should accept showMemo input', () => {
               expect(component.showMemo()).toBeTrue();
          });

          it('should accept showMultiSign input', () => {
               expect(component.showMultiSign()).toBeTrue();
          });

          it('should accept showRegularKey input', () => {
               expect(component.showRegularKey()).toBeTrue();
          });

          it('should accept showTicket input', () => {
               expect(component.showTicket()).toBeTrue();
          });

          it('should accept showSimulate input', () => {
               expect(component.showSimulate()).toBeTrue();
          });

          it('should update showMemo when changed', () => {
               fixture.componentRef.setInput('showMemo', false);
               fixture.detectChanges();
               expect(component.showMemo()).toBeFalse();
          });
     });

     describe('showPanel', () => {
          it('should return true when showWhenTab is *', () => {
               expect(component.showPanel()).toBeTrue();
          });

          it('should return true when tab is in string array', () => {
               fixture.componentRef.setInput('showWhenTab', ['createMpt', 'sendMpt']);
               fixture.detectChanges();
               expect(component.showPanel()).toBeTrue();
          });

          it('should return false when tab is not in array', () => {
               fixture.componentRef.setInput('showWhenTab', ['sendMpt', 'destroyMpt']);
               fixture.detectChanges();
               expect(component.showPanel()).toBeFalse();
          });

          it('should return true when showWhenTab matches tab string', () => {
               fixture.componentRef.setInput('showWhenTab', 'createMpt');
               fixture.detectChanges();
               expect(component.showPanel()).toBeTrue();
          });

          it('should return false when showWhenTab does not match tab', () => {
               fixture.componentRef.setInput('showWhenTab', 'sendMpt');
               fixture.detectChanges();
               expect(component.showPanel()).toBeFalse();
          });
     });

     describe('ticketItems', () => {
          it('should return empty array when ticketArray is empty', () => {
               xrplTxOptionsStore.ticketArray.set([]);
               const items = component.ticketItems();
               expect(items).toEqual([]);
          });

          it('should map tickets to display items', () => {
               xrplTxOptionsStore.ticketArray.set(['123', '456', '789']);
               const items = component.ticketItems();

               expect(items.length).toBe(3);
               expect(items[0]).toEqual({ id: '123', display: 'Ticket #123', secondary: 'Sequence: 123', isCurrentAccount: false, isCurrentCode: false, isCurrentToken: false });
               expect(items[1]).toEqual({ id: '456', display: 'Ticket #456', secondary: 'Sequence: 456', isCurrentAccount: false, isCurrentCode: false, isCurrentToken: false });
               expect(items[2]).toEqual({ id: '789', display: 'Ticket #789', secondary: 'Sequence: 789', isCurrentAccount: false, isCurrentCode: false, isCurrentToken: false });
          });
     });

     describe('selectedTicketItem', () => {
          it('should return null when no ticket is selected', () => {
               xrplTxOptionsStore.selectedSingleTicket.set('');
               const selected = component.selectedTicketItem();
               expect(selected).toBeNull();
          });

          it('should return matching ticket item when selected', () => {
               xrplTxOptionsStore.ticketArray.set(['123', '456']);
               xrplTxOptionsStore.selectedSingleTicket.set('456');

               const selected = component.selectedTicketItem();
               expect(selected).toEqual({ id: '456', display: 'Ticket #456', secondary: 'Sequence: 456', isCurrentAccount: false, isCurrentCode: false, isCurrentToken: false });
          });

          it('should return null when selected ticket not found', () => {
               xrplTxOptionsStore.ticketArray.set(['123', '456']);
               xrplTxOptionsStore.selectedSingleTicket.set('999');

               const selected = component.selectedTicketItem();
               expect(selected).toBeNull();
          });
     });

     describe('toggleSimulate', () => {
          it('should set isSimulateEnabled in store and call txUiService.toggleSimulate', () => {
               component.toggleSimulate(true);

               expect(xrplTxOptionsStore.setField).toHaveBeenCalledWith('isSimulateEnabled', true);
               expect(txUiService.toggleSimulate).toHaveBeenCalled();
          });
     });

     describe('onMemoToggled', () => {
          it('should set isMemoEnabled in store', () => {
               component.onMemoToggled(true);
               expect(xrplTxOptionsStore.setField).toHaveBeenCalledWith('isMemoEnabled', true);
          });

          it('should call addMemo with empty string when disabled', () => {
               component.onMemoToggled(false);
               expect(xrplTxOptionsStore.addMemo).toHaveBeenCalledWith('');
          });
     });

     describe('onMemoInput', () => {
          it('should split comma-separated string and update memos', () => {
               component.onMemoInput('memo1, memo2,  memo3  ');

               expect(xrplTxOptionsStore.updateMemos).toHaveBeenCalledWith(['memo1', 'memo2', 'memo3']);
          });

          it('should handle empty string', () => {
               component.onMemoInput('');

               expect(xrplTxOptionsStore.updateMemos).toHaveBeenCalledWith([]);
          });

          it('should filter out empty strings', () => {
               component.onMemoInput('memo1, , memo2,   , memo3');

               expect(xrplTxOptionsStore.updateMemos).toHaveBeenCalledWith(['memo1', 'memo2', 'memo3']);
          });
     });

     describe('onMultiSignToggled', () => {
          beforeEach(() => {
               accountConfiguratorStoreService.signers.set([{ Account: 'rSigner1', seed: 'sSeed1', SignerWeight: 1 }]);
          });

          it('should set useMultiSign in store', () => {
               component.onMultiSignToggled(true);
               expect(xrplTxOptionsStore.setField).toHaveBeenCalledWith('useMultiSign', true);
          });

          it('should disable regular key when enabling multi-sign', () => {
               xrplTxOptionsStore.isRegularKeyAddress.set(true);

               component.onMultiSignToggled(true);

               expect(xrplTxOptionsStore.setField).toHaveBeenCalledWith('isRegularKeyAddress', false);
          });

          it('should not disable regular key when toggling off', () => {
               component.onMultiSignToggled(false);

               expect(xrplTxOptionsStore.setField).not.toHaveBeenCalledWith('isRegularKeyAddress', false);
          });

          // it('should call toggleMultiSign when enabling', () => {
          //      component.onMultiSignToggled(true);

          //      expect(utilsService.toggleMultiSign).toHaveBeenCalledWith(true, accountConfiguratorStoreService.signers(), 'rTestAddress');
          // });
     });

     describe('onRegularKeyToggled', () => {
          it('should set isRegularKeyAddress in store', () => {
               component.onRegularKeyToggled(true);
               expect(xrplTxOptionsStore.setField).toHaveBeenCalledWith('isRegularKeyAddress', true);
          });

          it('should disable multi-sign when enabling regular key', () => {
               xrplTxOptionsStore.useMultiSign.set(true);

               component.onRegularKeyToggled(true);

               expect(xrplTxOptionsStore.setField).toHaveBeenCalledWith('useMultiSign', false);
          });
     });

     describe('hasAnyOptionEnabled', () => {
          it('should return false when all options are disabled', () => {
               xrplTxOptionsStore.isMemoEnabled.set(false);
               xrplTxOptionsStore.useMultiSign.set(false);
               xrplTxOptionsStore.isRegularKeyAddress.set(false);
               xrplTxOptionsStore.isTicket.set(false);

               expect(component.hasAnyOptionEnabled()).toBeFalse();
          });

          it('should return true when memo is enabled', () => {
               xrplTxOptionsStore.isMemoEnabled.set(true);
               expect(component.hasAnyOptionEnabled()).toBeTrue();
          });

          it('should return true when multi-sign is enabled', () => {
               xrplTxOptionsStore.useMultiSign.set(true);
               expect(component.hasAnyOptionEnabled()).toBeTrue();
          });

          it('should return true when regular key is enabled', () => {
               xrplTxOptionsStore.isRegularKeyAddress.set(true);
               expect(component.hasAnyOptionEnabled()).toBeTrue();
          });

          it('should return true when ticket is enabled', () => {
               xrplTxOptionsStore.isTicket.set(true);
               expect(component.hasAnyOptionEnabled()).toBeTrue();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty signers array in onMultiSignToggled', () => {
               accountConfiguratorStoreService.signers.set([]);

               component.onMultiSignToggled(true);

               expect(utilsService.toggleMultiSign).toHaveBeenCalled();
          });

          it('should handle null selectedWallet in onMultiSignToggled', () => {
               walletManagerService.getSelectedWallet.and.returnValue(null);

               component.onMultiSignToggled(true);

               expect(utilsService.toggleMultiSign).toHaveBeenCalled();
          });
     });
});
