import { Component, inject, effect, ChangeDetectorRef, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { AppConstants } from '../../core/app.constants';
import { ToastService } from '../../services/utils/toast/toast.service';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { WalletsStoreService } from '../../services/wallets/wallets-store/wallets-store.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { WalletsUtilService } from '../../services/wallets/wallets-util/wallets-util.service';
import { WalletConfiguratorOrchestratorService } from '../../services/wallets/wallet-configurator-orchestrator/wallet-configurator-orchestrator.service';

@Component({
     selector: 'app-wallet-panel',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule, ExecutionTimeDisplayComponent],
     templateUrl: './wallet-panel.component.html',
     styleUrl: './wallet-panel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletPanelComponent extends PerformanceBaseComponent {
     private readonly walletManagerService = inject(WalletManagerService);
     private readonly walletGenerator = inject(WalletGeneratorService);
     private readonly walletDataService = inject(WalletDataService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly toastService = inject(ToastService);
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletConfiguratorOrchestratorService = inject(WalletConfiguratorOrchestratorService);

     readonly editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

     // Prefer the panel's own execution time; fall back to the orchestrator's
     // so that wallet generation triggered from the Wallets page also shows a time.
     readonly displayExecutionTime = computed(() => this.executionTime() || this.walletConfiguratorOrchestratorService.executionTimeValue());

     @Output() walletSelected = new EventEmitter<Wallet>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

     wallets: Wallet[] = [];
     selectedWalletIndex = 0;
     currentWallet: Wallet = this.getEmptyWallet();
     hasWallets = false;
     tempName = '';

     private readonly _hasWalletsEffect = effect(() => {
          if (this.walletManagerService.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     private readonly _walletsEffect = effect(() => {
          const currentWallets = this.walletManagerService.wallets();

          this.wallets = currentWallets ?? [];
          this.hasWallets = this.wallets.length > 0;

          // Clamp index
          this.selectedWalletIndex = Math.max(0, Math.min(this.selectedWalletIndex, this.wallets.length - 1));

          this.updateCurrentWallet();
          this.cdr.detectChanges(); // remove later if zoneless / unnecessary
     });

     private readonly _selectedIndexEffect = effect(() => {
          const index = this.walletManagerService.selectedIndex();

          if (index < 0 || index >= this.wallets.length) return;

          this.selectedWalletIndex = index;
          this.updateCurrentWallet();

          this.walletSelected.emit(this.currentWallet);
          this.cdr.detectChanges();
     });

     // Optional: safety clamp when both change
     private readonly _clampEffect = effect(() => {
          const list = this.walletManagerService.wallets();
          const idx = this.walletManagerService.selectedIndex();

          if (idx >= list.length) {
               this.walletManagerService.setSelectedIndex(Math.max(0, list.length - 1));
          }
     });

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     private getEmptyWallet(): Wallet {
          return {
               classicAddress: '',
               address: '',
               seed: '',
               name: undefined,
               balance: '0',
               ownerCount: undefined,
               xrpReserves: undefined,
               spendableXrp: undefined,
          };
     }

     private updateCurrentWallet() {
          if (this.wallets.length > 0 && this.selectedWalletIndex >= 0) {
               this.currentWallet = { ...this.wallets[this.selectedWalletIndex] };
          } else {
               this.currentWallet = this.getEmptyWallet();
          }
     }

     selectWallet(index: number) {
          if (index === this.selectedWalletIndex) return;

          this.selectedWalletIndex = index;
          this.updateCurrentWallet();

          this.walletManagerService.setSelectedIndex(index);
          this.walletSelected.emit(this.currentWallet);
     }

     editName(index: number) {
          this.walletManagerService.startEdit(index);
          const wallet = this.wallets[index];
          this.tempName = wallet.name || `Wallet ${index + 1}`;
          setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
     }

     saveName() {
          this.walletManagerService.saveEdit(this.tempName);
          this.tempName = '';
     }

     cancelEdit() {
          this.walletManagerService.cancelEdit();
          this.tempName = '';
     }

     toggleSecret(index: number) {
          this.wallets[index] = {
               ...this.wallets[index],
               showSecret: !this.wallets[index].showSecret,
          };
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          if (!wallet?.address) return;

          try {
               const client = await this.xrplService.getClient();
               await this.walletDataService.refreshWallets(client, [wallet.address]);
          } catch (err) {
               console.error('Refresh balance failed', err);
          }
     }

     deleteWallet(index: number) {
          if (!confirm('Delete this wallet? This cannot be undone.')) return;
          this.walletManagerService.deleteWallet(index);
     }

     // Called by the all pages except the Wallet Configurator page
     async generateNewAccount() {
          this.walletsStoreService.updateField('buttonLoading', state => ({
               ...state,
               generateNewWalletFromSeed: true,
          }));

          await this.withPerf('generateNewAccount', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    const newWallet = await this.walletGenerator.generateWallet('familySeed', this.environment(), this.walletsStoreService.encryptionType());

                    const client = await this.xrplService.getClient();
                    await this.walletDataService.refreshWallets(client, [newWallet.address]);

                    /**
                     * Uncomment to auto-select the new wallet.
                     * const freshWallets = this.walletManagerService.wallets(); // fresh read
                     * const newIndex = freshWallets.findIndex(w => w.address === newWallet.address);
                     *
                     * if (newIndex !== -1) {
                     *   this.walletManagerService.setSelectedIndex(newIndex);
                     * }
                     */

                    // Success actions – do them synchronously first
                    this.updateCurrentWallet();
                    this.walletSelected.emit(this.currentWallet);

                    // Set result signal + toast
                    this.txUiService.setTxResultSignal(newWallet);
                    this.toastService.success(`Generated ${newWallet.address || newWallet.wallet?.classicAddress} wallet successfully!`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    console.error('Generate account failed', error);
                    this.toastService.error(error.message || 'Unknown error', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
                    this.walletsStoreService.updateField('buttonLoading', state => ({
                         ...state,
                         generateNewWalletFromSeed: false,
                    }));

                    // executionTime signal was updated by withPerf — notify OnPush
                    this.cdr.detectChanges();
               }
          });
     }

     dropWallet(event: CdkDragDrop<Wallet[]>) {
          moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);

          // Adjust selected index after reordering
          if (this.selectedWalletIndex === event.previousIndex) {
               this.selectedWalletIndex = event.currentIndex;
          } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
               this.selectedWalletIndex--;
          } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
               this.selectedWalletIndex++;
          }

          this.walletManagerService.setWallets([...this.wallets]);
          this.updateCurrentWallet();
          this.walletSelected.emit(this.currentWallet);
          this.walletManagerService.setSelectedIndex(this.selectedWalletIndex);
     }
}
