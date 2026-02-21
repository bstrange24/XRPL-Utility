import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject, takeUntil, pairwise, startWith } from 'rxjs';

import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { AppConstants } from '../../core/app.constants';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';

@Component({
     selector: 'app-wallet-panel',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule],
     templateUrl: './wallet-panel.component.html',
     styleUrl: './wallet-panel.component.css',
})
export class WalletPanelComponent extends PerformanceBaseComponent implements OnInit, OnDestroy {
     private readonly destroy$ = new Subject<void>();
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly copyUtilService = inject(CopyUtilService);

     @Output() walletSelected = new EventEmitter<Wallet>();

     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

     wallets: Wallet[] = [];
     selectedWalletIndex = 0;
     currentWallet: Wallet = this.getEmptyWallet();
     editingIndex!: (index: number) => boolean;

     hasWallets = false;
     tempName = '';

     // Bind service method once
     readonly isEditing = this.walletManagerService.isEditing.bind(this.walletManagerService);

     constructor(
          private readonly walletManager: WalletManagerService,
          private readonly walletGenerator: WalletGeneratorService,
          public readonly copyUtil: CopyUtilService,
          private readonly walletDataService: WalletDataService,
          public readonly txUiService: TransactionUiService
     ) {
          super();
     }

     ngOnInit() {
          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          // Wallets changes → local sync
          this.walletManager.wallets$.pipe(startWith(null as Wallet[] | null), pairwise(), takeUntil(this.destroy$)).subscribe(([_, current]) => {
               this.wallets = current ?? [];
               this.hasWallets = this.wallets.length > 0;

               // Clamp index to valid range
               this.selectedWalletIndex = Math.max(0, Math.min(this.selectedWalletIndex, this.wallets.length - 1));

               this.updateCurrentWallet();
               this.cdr.detectChanges();
          });

          // Selected index changes (from service) → local UI sync + notify parent
          this.walletManager.selectedIndex$.pipe(takeUntil(this.destroy$)).subscribe(index => {
               if (index < 0 || index >= this.wallets.length) return;

               this.selectedWalletIndex = index;
               this.updateCurrentWallet();
               this.walletSelected.emit(this.currentWallet); // Important: keeps initial load working
               this.cdr.detectChanges();
          });
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

          // Notify parent (Checks, Send XRP, etc.)
          this.walletSelected.emit(this.currentWallet);

          // Update shared service state
          this.walletManager.setSelectedIndex(index);
     }

     editName(index: number) {
          this.walletManager.startEdit(index);
          const wallet = this.wallets[index];
          this.tempName = wallet.name || `Wallet ${index + 1}`;
          setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
     }

     saveName() {
          this.walletManager.saveEdit(this.tempName);
          this.tempName = '';
     }

     cancelEdit() {
          this.walletManager.cancelEdit();
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
               const client = await this.xrplService.getClient(); // assuming xrplService is injected or available
               await this.walletDataService.refreshWallets(client, this.wallets, this.selectedWalletIndex, [wallet.address]);
          } catch (err) {
               console.error('Refresh balance failed', err);
          }
     }

     deleteWallet(index: number) {
          if (!confirm('Delete this wallet? This cannot be undone.')) return;

          this.walletManager.deleteWallet(index);

          // After delete, service will emit new wallets$ and selectedIndex$
          // → subscriptions above will handle UI update
     }

     async generateNewAccount() {
          await this.measure('generateNewAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();

               try {
                    const newWallet = await this.walletGenerator.generateNewAccount(
                         this.wallets,
                         this.environment(), // assuming this comes from base or injected
                         AppConstants.ENCRYPTION.ED25519
                    );

                    const client = await this.xrplService.getClient(); // assuming injected
                    await this.walletDataService.refreshWallets(client, this.wallets, this.selectedWalletIndex, [newWallet.address]);

                    this.txUiService.clearWarning();
                    this.walletManager.setSelectedIndex(this.wallets.length - 1); // select the new one
               } catch (err: any) {
                    console.error('Generate account failed', err);
                    this.txUiService.setError(err.message || 'Unknown error');
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     dropWallet(event: CdkDragDrop<Wallet[]>) {
          moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);

          // Adjust selected index after drag
          if (this.selectedWalletIndex === event.previousIndex) {
               this.selectedWalletIndex = event.currentIndex;
          } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
               this.selectedWalletIndex--;
          } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
               this.selectedWalletIndex++;
          }

          this.walletManager.setWallets([...this.wallets]); // immutable copy
          this.updateCurrentWallet();
          this.walletSelected.emit(this.currentWallet);
          this.walletManager.setSelectedIndex(this.selectedWalletIndex);
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }
}

// import { Component, signal, computed, effect, inject, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { LucideAngularModule } from 'lucide-angular';
// import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

// import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
// import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
// import { CopyUtilService } from '../../services/copy-util/copy-util.service';
// import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
// import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
// import { AppConstants } from '../../core/app.constants';
// import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';

// @Component({
//      selector: 'app-wallet-panel',
//      standalone: true,
//      imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule],
//      templateUrl: './wallet-panel.component.html',
//      styleUrl: './wallet-panel.component.css',
//      changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class WalletPanelComponent extends PerformanceBaseComponent {
//      private readonly walletManager = inject(WalletManagerService);
//      private readonly walletGenerator = inject(WalletGeneratorService);
//      private readonly walletDataService = inject(WalletDataService);
//      public readonly copyUtil = inject(CopyUtilService);
//      public readonly txUiService = inject(TransactionUiService);
//      public readonly copyUtilService = inject(CopyUtilService);

//      @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

//      // Local UI state (derived from service when possible)
//      readonly wallets = this.walletManager.wallets;
//      readonly selectedIndex = this.walletManager.selectedIndex;
//      readonly currentWallet = this.walletManager.currentWallet;
//      readonly hasWallets = computed(() => this.wallets().length > 0);

//      // Editing state (local + service)
//      readonly editingIndex = this.walletManager.isEditing; // assuming service exposes a computed or method
//      readonly tempName = signal<string>('');

//      constructor() {
//           super();

//           // Optional: react to wallet list changes if you need side-effects
//           // (most UI updates are automatic via signals)
//           effect(
//                () => {
//                     // Clamp index when wallets change
//                     const list = this.wallets();
//                     const idx = this.selectedIndex();
//                     if (idx >= list.length) {
//                          this.walletManager.setSelectedIndex(Math.max(0, list.length - 1));
//                     }
//                },
//                { allowSignalWrites: true }
//           );
//      }

//      selectWallet(index: number) {
//           if (index === this.selectedIndex()) return;
//           this.walletManager.setSelectedIndex(index);
//           // Parent components will react to currentWallet() change automatically
//      }

//      editName(index: number) {
//           this.walletManager.startEdit(index);
//           const wallet = this.wallets()[index];
//           this.tempName.set(wallet?.name || `Wallet ${index + 1}`);
//           setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
//      }

//      saveName() {
//           this.walletManager.saveEdit(this.tempName());
//           this.tempName.set('');
//      }

//      cancelEdit() {
//           this.walletManager.cancelEdit();
//           this.tempName.set('');
//      }

//      toggleSecret(index: number) {
//           const list = [...this.wallets()];
//           list[index] = {
//                ...list[index],
//                showSecret: !list[index].showSecret,
//           };
//           this.walletManager.setWallets(list);
//      }

//      async refreshBalance(index: number) {
//           const wallet = this.wallets()[index];
//           if (!wallet?.address) return;

//           try {
//                const client = await this.xrplService.getClient(); // assuming xrplService injected or global
//                await this.walletDataService.refreshWallets(client, this.wallets(), this.selectedIndex(), [wallet.address]);
//           } catch (err) {
//                console.error('Refresh balance failed', err);
//           }
//      }

//      deleteWallet(index: number) {
//           if (!confirm('Delete this wallet? This cannot be undone.')) return;
//           this.walletManager.deleteWallet(index);
//           // Service should update wallets + selectedIndex signals → UI auto-updates
//      }

//      async generateNewAccount() {
//           await this.measure('generateNewAccount', true, async () => {
//                this.txUiService.resetCurrentStepToIdle();

//                try {
//                     const newWallet = await this.walletGenerator.generateNewAccount(
//                          this.wallets(),
//                          this.environment(), // assuming from base or injected
//                          AppConstants.ENCRYPTION.ED25519
//                     );

//                     const client = await this.xrplService.getClient();
//                     await this.walletDataService.refreshWallets(client, this.wallets(), this.selectedIndex(), [newWallet.address]);

//                     // Auto-select the new wallet
//                     const newIndex = this.wallets().findIndex(w => w.address === newWallet.address);
//                     if (newIndex !== -1) {
//                          this.walletManager.setSelectedIndex(newIndex);
//                     }

//                     this.txUiService.clearWarning();
//                } catch (err: any) {
//                     console.error('Generate account failed', err);
//                     this.txUiService.setError(err.message || 'Unknown error');
//                } finally {
//                     this.txUiService.resetCurrentStepToIdle();
//                }
//           });
//      }

//      dropWallet(event: CdkDragDrop<Wallet[]>) {
//           const newList = [...this.wallets()];
//           moveItemInArray(newList, event.previousIndex, event.currentIndex);

//           let newIndex = this.selectedIndex();

//           if (newIndex === event.previousIndex) {
//                newIndex = event.currentIndex;
//           } else if (newIndex > event.previousIndex && newIndex <= event.currentIndex) {
//                newIndex--;
//           } else if (newIndex < event.previousIndex && newIndex >= event.currentIndex) {
//                newIndex++;
//           }

//           this.walletManager.setWallets(newList);
//           this.walletManager.setSelectedIndex(newIndex);
//      }
// }

// OG
// import { Component, OnInit, ChangeDetectorRef, inject, EventEmitter, Output, ElementRef, ViewChild, OnDestroy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { LucideAngularModule } from 'lucide-angular';
// import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
// import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
// import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
// import { CopyUtilService } from '../../services/copy-util/copy-util.service';
// import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
// import { pairwise, startWith, takeUntil, Subject } from 'rxjs';
// import { AppConstants } from '../../core/app.constants';
// import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
// import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';

// @Component({
//      selector: 'app-wallet-panel',
//      standalone: true,
//      imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule],
//      templateUrl: './wallet-panel.component.html',
//      styleUrl: './wallet-panel.component.css',
// })
// export class WalletPanelComponent extends PerformanceBaseComponent implements OnInit, OnDestroy {
//      private readonly destroy$ = new Subject<void>();
//      private readonly cdr = inject(ChangeDetectorRef);
//      @Output() walletSelected = new EventEmitter<Wallet>();
//      @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
//      wallets: Wallet[] = [];
//      selectedWalletIndex = 0;
//      currentWallet: Wallet = {
//           classicAddress: '',
//           address: '',
//           seed: '',
//           name: undefined,
//           balance: '0',
//           ownerCount: undefined,
//           xrpReserves: undefined,
//           spendableXrp: undefined,
//      };
//      hasWallets = false;
//      tempName = '';
//      editingIndex!: (index: number) => boolean;

//      constructor(
//           private readonly walletManagerService: WalletManagerService,
//           private readonly walletGenerator: WalletGeneratorService,
//           public readonly copyUtilService: CopyUtilService,
//           private readonly walletDataService: WalletDataService,
//           public readonly txUiService: TransactionUiService
//      ) {
//           super();
//      }

//      ngOnInit() {
//           this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

//           this.walletManagerService.wallets$.pipe(startWith(null), pairwise(), takeUntil(this.destroy$)).subscribe(([prev, curr]) => {
//                this.wallets = curr || [];
//                this.hasWallets = this.wallets.length > 0;
//                this.selectedWalletIndex = Math.min(this.selectedWalletIndex, this.wallets.length - 1 || 0);
//                this.updateCurrentWallet();
//                this.cdr.detectChanges();
//           });

//           this.walletManagerService.selectedIndex$.pipe(takeUntil(this.destroy$)).subscribe(index => {
//                if (index >= 0 && index < this.wallets.length) {
//                     this.selectedWalletIndex = index;
//                     this.updateCurrentWallet();
//                     this.walletSelected.emit(this.currentWallet);
//                     this.cdr.detectChanges();
//                }
//           });
//      }

//      private syncSelectedIndex() {
//           this.walletManagerService.setSelectedIndex(this.selectedWalletIndex);
//      }

//      updateCurrentWallet() {
//           if (this.wallets.length > 0) {
//                this.currentWallet = { ...this.wallets[this.selectedWalletIndex] };
//           }
//      }

//      selectWallet(index: number) {
//           if (this.selectedWalletIndex === index) return;
//           this.selectedWalletIndex = index;
//           this.updateCurrentWallet();

//           this.walletSelected.emit(this.currentWallet);
//           this.syncSelectedIndex();
//      }

//      editName(i: number) {
//           this.walletManagerService.startEdit(i);
//           const wallet = this.wallets[i];
//           this.tempName = wallet.name || `Wallet ${i + 1}`;
//           setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
//      }

//      saveName() {
//           this.walletManagerService.saveEdit(this.tempName);
//           this.tempName = '';
//      }

//      cancelEdit() {
//           this.walletManagerService.cancelEdit();
//           this.tempName = '';
//      }

//      toggleSecret(index: number) {
//           this.wallets[index].showSecret = !this.wallets[index].showSecret;
//      }

//      async refreshBalance(index: number) {
//           const wallet = this.wallets[index];
//           const client = await this.xrplService.getClient();
//           await this.walletDataService.refreshWallets(client, this.wallets, this.selectedWalletIndex, [wallet.address]);
//      }

//      deleteWallet(index: number) {
//           if (confirm('Delete this wallet? This cannot be undone.')) {
//                this.walletManagerService.deleteWallet(index);
//                this.updateCurrentWallet();
//                this.walletSelected.emit(this.currentWallet);
//           }
//      }

//      async generateNewAccount() {
//           await this.measure('generateNewAccount', true, async () => {
//                this.txUiService.resetCurrentStepToIdle();
//                try {
//                     // Default to ed25519
//                     const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment(), AppConstants.ENCRYPTION.ED25519);
//                     const client = await this.xrplService.getClient();
//                     await this.walletDataService.refreshWallets(client, this.wallets, this.selectedWalletIndex, [faucetWallet.address]);
//                     this.txUiService.clearWarning();
//                     this.syncSelectedIndex();
//                } catch (error: any) {
//                     console.error('Error in generateNewAccount:', error);
//                     this.txUiService.setError(`${error.message || 'Unknown error'}`);
//                } finally {
//                     this.txUiService.resetCurrentStepToIdle();
//                }
//           });
//      }

//      dropWallet(event: CdkDragDrop<Wallet[]>) {
//           moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);
//           if (this.selectedWalletIndex === event.previousIndex) {
//                this.selectedWalletIndex = event.currentIndex;
//           } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
//                this.selectedWalletIndex--;
//           } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
//                this.selectedWalletIndex++;
//           }
//           this.walletManagerService.setWallets(this.wallets);
//           this.updateCurrentWallet();
//           this.walletSelected.emit(this.currentWallet);
//           this.syncSelectedIndex();
//      }

//      ngOnDestroy() {
//           this.destroy$.next();
//           this.destroy$.complete();
//      }
// }
