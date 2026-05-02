import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, Input, signal } from '@angular/core';
import { WalletPanelComponent } from './wallet-panel.component';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { WalletsStoreService } from '../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../services/wallets/wallets-util/wallets-util.service';
import { WalletConfiguratorOrchestratorService } from '../../services/wallets/wallet-configurator-orchestrator/wallet-configurator-orchestrator.service';
import { ThemeService } from '../../services/utils/theme/theme.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideAngularModule, LucideIconProvider, icons } from 'lucide-angular';
import { BehaviorSubject } from 'rxjs';

// Mock Client
const mockClient = {
     request: jasmine.createSpy('request'),
     disconnect: jasmine.createSpy('disconnect'),
} as any;

@Component({
     selector: 'lucide-icon',
     template: '<span></span>',
     standalone: true,
})
class MockLucideIcon {
     @Input() name: string = '';
     @Input() size: number = 16;
}

describe('WalletPanelComponent', () => {
     let component: WalletPanelComponent;
     let fixture: ComponentFixture<WalletPanelComponent>;

     // Services - use object literals instead of createSpyObj where possible
     let walletManagerService: any;
     let walletGeneratorService: any;
     let copyUtilService: any;
     let walletDataService: any;
     let txUiService: any;
     let toastService: any;
     let walletsStoreService: any;
     let xrplService: any;
     let themeService: any;

     // Mock data
     const mockWallets: Wallet[] = [
          {
               address: 'rWallet1',
               classicAddress: 'rWallet1',
               seed: 'seed123',
               name: 'Wallet 1',
               balance: '100',
               ownerCount: '5',
               xrpReserves: '10',
               spendableXrp: '90',
               showSecret: false,
          },
          {
               address: 'rWallet2',
               classicAddress: 'rWallet2',
               seed: 'seed456',
               name: 'Wallet 2',
               balance: '200',
               ownerCount: '3',
               xrpReserves: '6',
               spendableXrp: '194',
               showSecret: false,
          },
          {
               address: 'rWallet3',
               classicAddress: 'rWallet3',
               seed: 'seed789',
               name: 'Wallet 3',
               balance: '50',
               ownerCount: '2',
               xrpReserves: '4',
               spendableXrp: '46',
               showSecret: false,
          },
     ];

     beforeEach(async () => {
          // Create mocks as plain objects
          walletManagerService = {
               wallets: signal([...mockWallets]),
               hasWallets: signal(true),
               selectedIndex: signal(0),
               isEditing: jasmine.createSpy('isEditing').and.returnValue(false),
               setSelectedIndex: jasmine.createSpy('setSelectedIndex'),
               startEdit: jasmine.createSpy('startEdit'),
               saveEdit: jasmine.createSpy('saveEdit'),
               cancelEdit: jasmine.createSpy('cancelEdit'),
               deleteWallet: jasmine.createSpy('deleteWallet'),
               setWallets: jasmine.createSpy('setWallets'),
          };

          walletGeneratorService = {
               generateWallet: jasmine.createSpy('generateWallet'),
          };

          copyUtilService = {
               copyAddress: jasmine.createSpy('copyAddress'),
               copySeed: jasmine.createSpy('copySeed'),
          };

          walletDataService = {
               refreshWallets: jasmine.createSpy('refreshWallets'),
          };

          txUiService = {
               currentStep: signal('idle'),
               warningMessage: '',
               clearWarning: jasmine.createSpy('clearWarning'),
               setWarning: jasmine.createSpy('setWarning'),
               setError: jasmine.createSpy('setError'),
               setInfoMessage: jasmine.createSpy('setInfoMessage'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               clearTxResultsHash: jasmine.createSpy('clearTxResultsHash'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
          };

          toastService = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
          };

          walletsStoreService = {
               encryptionType: signal('familySeed'),
               updateField: jasmine.createSpy('updateField'),
          };

          xrplService = {
               getClient: jasmine.createSpy('getClient').and.returnValue(Promise.resolve(mockClient)),
               getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
          };

          themeService = {
               darkMode$: new BehaviorSubject(false),
          };

          await TestBed.configureTestingModule({
               imports: [WalletPanelComponent],
               providers: [
                    provideNoopAnimations(),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: WalletGeneratorService, useValue: walletGeneratorService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: ToastService, useValue: toastService },
                    { provide: WalletsStoreService, useValue: walletsStoreService },
                    { provide: WalletsUtilService, useValue: {} }, // Empty object, no spies needed
                    { provide: WalletConfiguratorOrchestratorService, useValue: { executionTimeValue: signal('') } },
                    { provide: XrplService, useValue: xrplService },
                    { provide: ThemeService, useValue: themeService },
               ],
          })
               .overrideComponent(WalletPanelComponent, {
                    remove: { imports: [LucideAngularModule] },
                    add: { imports: [MockLucideIcon] },
               })
               .compileComponents();

          fixture = TestBed.createComponent(WalletPanelComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset all spies
          if (walletManagerService.setSelectedIndex) {
               walletManagerService.setSelectedIndex.calls.reset();
          }
          if (walletManagerService.setWallets) {
               walletManagerService.setWallets.calls.reset();
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Initialization', () => {
          it('should initialize with default values', () => {
               expect(component.expandedWallets()).toEqual(new Set());
               expect(component.isWalletPanelExpanded()).toBeTrue();
               expect(component.wallets.length).toBe(3);
               expect(component.hasWallets).toBeTrue();
               expect(component.selectedWalletIndex).toBe(0);
          });

          it('should load panel expanded state from localStorage', () => {
               localStorage.setItem('walletPanelExpanded', 'false');
               const newComponent = TestBed.createComponent(WalletPanelComponent).componentInstance;
               expect(newComponent.isWalletPanelExpanded()).toBeFalse();
               localStorage.removeItem('walletPanelExpanded');
          });

          it('should set warning when no wallets exist', () => {
               walletManagerService.hasWallets = signal(false);
               walletManagerService.wallets = signal([]);

               fixture = TestBed.createComponent(WalletPanelComponent);
               component = fixture.componentInstance;
               fixture.detectChanges();

               expect(txUiService.setWarning).toHaveBeenCalled();
          });
     });

     describe('Wallet Selection', () => {
          it('should select wallet by index', () => {
               component.selectWallet(1);

               expect(component.selectedWalletIndex).toBe(1);
               expect(component.currentWallet.address).toBe('rWallet2');
               expect(walletManagerService.setSelectedIndex).toHaveBeenCalledWith(1);
          });

          it('should not select same wallet again', () => {
               const initialCalls = walletManagerService.setSelectedIndex.calls.count();
               component.selectWallet(0);

               expect(walletManagerService.setSelectedIndex.calls.count()).toBe(initialCalls);
          });

          it('should update current wallet when selected index changes', () => {
               component.selectWallet(2);

               expect(component.currentWallet.address).toBe('rWallet3');
          });

          it('should emit walletSelected event', () => {
               spyOn(component.walletSelected, 'emit');

               component.selectWallet(1);

               expect(component.walletSelected.emit).toHaveBeenCalled();
          });
     });

     describe('Wallet Expansion', () => {
          it('should toggle wallet expansion', () => {
               component.toggleWalletExpansion(0);
               expect(component.isWalletExpanded(0)).toBeTrue();

               component.toggleWalletExpansion(0);
               expect(component.isWalletExpanded(0)).toBeFalse();
          });

          it('should collapse all wallets', () => {
               component.expandedWallets.set(new Set([0, 1, 2]));
               component.collapseAllWallets();

               expect(component.expandedWallets().size).toBe(0);
          });

          it('should toggle all wallets', () => {
               component.toggleAllWallets();
               expect(component.expandedWallets().size).toBe(3);

               component.toggleAllWallets();
               expect(component.expandedWallets().size).toBe(0);
          });

          it('should compute areAllCollapsed correctly', () => {
               expect(component.areAllCollapsed()).toBeTrue();

               component.expandedWallets.set(new Set([0]));
               expect(component.areAllCollapsed()).toBeFalse();
          });

          it('should handle wallet header click without toggling when clicking buttons', () => {
               const event = { target: { closest: () => true } } as any;
               const toggleSpy = spyOn(component, 'toggleWalletExpansion');

               component.handleWalletHeaderClick(event, 0);

               expect(toggleSpy).not.toHaveBeenCalled();
          });

          it('should toggle expansion on header click when not editing', () => {
               const event = { target: { closest: () => false } } as any;
               const toggleSpy = spyOn(component, 'toggleWalletExpansion');
               walletManagerService.isEditing.and.returnValue(false);

               component.handleWalletHeaderClick(event, 0);

               expect(toggleSpy).toHaveBeenCalledWith(0);
          });
     });

     describe('Wallet Editing', () => {
          it('should start editing wallet name', () => {
               component.editName(0);

               expect(walletManagerService.startEdit).toHaveBeenCalledWith(0);
               expect(component.tempName).toBe('Wallet 1');
          });

          it('should save edited name', () => {
               component.tempName = 'New Name';
               component.saveName();

               expect(walletManagerService.saveEdit).toHaveBeenCalledWith('New Name');
               expect(component.tempName).toBe('');
          });

          it('should cancel edit', () => {
               component.cancelEdit();

               expect(walletManagerService.cancelEdit).toHaveBeenCalled();
               expect(component.tempName).toBe('');
          });
     });

     describe('Toggle Secret', () => {
          it('should toggle showSecret property', () => {
               expect(component.wallets[0].showSecret).toBeFalse();

               component.toggleSecret(0);
               expect(component.wallets[0].showSecret).toBeTrue();

               component.toggleSecret(0);
               expect(component.wallets[0].showSecret).toBeFalse();
          });
     });

     describe('Refresh Balance', () => {
          it('should refresh wallet balance', async () => {
               await component.refreshBalance(0);

               expect(xrplService.getClient).toHaveBeenCalled();
               expect(walletDataService.refreshWallets).toHaveBeenCalled();
          });

          it('should handle missing wallet address', async () => {
               const walletWithoutAddress = { ...mockWallets[0], address: '' };
               component.wallets[0] = walletWithoutAddress;

               await component.refreshBalance(0);

               expect(walletDataService.refreshWallets).not.toHaveBeenCalled();
          });

          it('should handle errors gracefully', async () => {
               walletDataService.refreshWallets.and.returnValue(Promise.reject('Network error'));

               await expectAsync(component.refreshBalance(0)).toBeResolved();
          });
     });

     describe('Delete Wallet', () => {
          beforeEach(() => {
               spyOn(window, 'confirm').and.returnValue(true);
          });

          it('should delete wallet when confirmed', () => {
               component.deleteWallet(0);

               expect(walletManagerService.deleteWallet).toHaveBeenCalledWith(0);
          });

          it('should not delete wallet when cancelled', () => {
               (window.confirm as jasmine.Spy).and.returnValue(false);

               component.deleteWallet(0);

               expect(walletManagerService.deleteWallet).not.toHaveBeenCalled();
          });
     });

     describe('Generate New Account', () => {
          const mockNewWallet = { address: 'rNewWallet', classicAddress: 'rNewWallet', seed: 'newSeed' };

          beforeEach(() => {
               walletGeneratorService.generateWallet.and.returnValue(Promise.resolve(mockNewWallet));
               walletDataService.refreshWallets.and.returnValue(Promise.resolve());
          });

          it('should generate new wallet successfully', async () => {
               await component.generateNewAccount();

               expect(walletGeneratorService.generateWallet).toHaveBeenCalled();
               expect(toastService.success).toHaveBeenCalled();
          });

          it('should handle generation error', async () => {
               walletGeneratorService.generateWallet.and.returnValue(Promise.reject({ message: 'Generation failed' }));

               await component.generateNewAccount();

               expect(toastService.error).toHaveBeenCalled();
          });

          it('should update button loading state', async () => {
               const updatePromise = component.generateNewAccount();

               expect(walletsStoreService.updateField).toHaveBeenCalled();

               await updatePromise;

               expect(walletsStoreService.updateField).toHaveBeenCalledTimes(2);
          });
     });

     describe('Drag and Drop', () => {
          beforeEach(() => {
               component.wallets = [...mockWallets];
               component.expandedWallets.set(new Set([0, 2]));
               component.selectedWalletIndex = 1;
          });

          it('should reorder wallets on drop', () => {
               const event = { previousIndex: 0, currentIndex: 2 } as CdkDragDrop<Wallet[]>;

               component.drop(event);

               expect(component.wallets[2].address).toBe('rWallet1');
               expect(walletManagerService.setWallets).toHaveBeenCalled();
          });

          it('should not reorder if indices are same', () => {
               const initialCalls = walletManagerService.setWallets.calls.count();
               const event = { previousIndex: 0, currentIndex: 0 } as CdkDragDrop<Wallet[]>;

               component.drop(event);

               expect(walletManagerService.setWallets.calls.count()).toBe(initialCalls);
          });

          it('should preserve expanded states after reorder', () => {
               const event = { previousIndex: 0, currentIndex: 2 } as CdkDragDrop<Wallet[]>;

               component.drop(event);

               expect(component.expandedWallets().has(2)).toBeTrue();
          });

          it('should update selected index correctly when moving selected wallet', () => {
               component.selectedWalletIndex = 0;
               const event = { previousIndex: 0, currentIndex: 2 } as CdkDragDrop<Wallet[]>;

               component.drop(event);

               expect(component.selectedWalletIndex).toBe(2);
          });
     });

     describe('Main Panel Expansion', () => {
          it('should toggle main wallet panel', () => {
               component.toggleMainWalletPanel();
               expect(component.isWalletPanelExpanded()).toBeFalse();

               component.toggleMainWalletPanel();
               expect(component.isWalletPanelExpanded()).toBeTrue();
          });

          it('should collapse all wallets when main panel is collapsed', () => {
               component.expandedWallets.set(new Set([0, 1]));
               component.toggleMainWalletPanel();

               expect(component.expandedWallets().size).toBe(0);
          });
     });

     describe('Computed Values', () => {
          it('should compute safe warning message', () => {
               txUiService.warningMessage = '<script>alert("xss")</script>';
               fixture.detectChanges();

               const result = component.safeWarningMessage();
               expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
          });

          it('should display execution time', () => {
               (component as any).executionTime = signal('123ms');
               expect(component.displayExecutionTime()).toBe('123ms');
          });
     });

     describe('Edge Cases', () => {
          // it('should handle empty wallets array', fakeAsync(() => {
          //      // Change the signal value
          //      walletManagerService.wallets = signal([]);
          //      walletManagerService.hasWallets = signal(false);

          //      // Force change detection
          //      fixture.detectChanges();

          //      // Tick to allow the effect to run
          //      tick();

          //      expect(component.wallets).toEqual([]);
          //      expect(component.hasWallets).toBeFalse();
          // }));

          it('should clamp selected index when wallets change', fakeAsync(() => {
               walletManagerService.wallets = signal([mockWallets[0]]);
               fixture.detectChanges();

               tick();

               expect(component.selectedWalletIndex).toBe(0);
          }));

          it('should handle refresh balance with invalid index', async () => {
               await component.refreshBalance(999);

               expect(walletDataService.refreshWallets).not.toHaveBeenCalled();
          });

          it('should handle name editing with fallback name', () => {
               const walletWithoutName = { ...mockWallets[0], name: undefined };
               component.wallets[0] = walletWithoutName;

               component.editName(0);

               expect(component.tempName).toBe('Wallet 1');
          });
     });
});
