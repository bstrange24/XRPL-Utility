import { Component, OnInit, ChangeDetectorRef, inject, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { pairwise, startWith, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';

@Component({
     selector: 'app-wallet-panel',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule],
     templateUrl: './wallet-panel.component.html',
     styleUrl: './wallet-panel.component.css',
})
export class WalletPanelComponent implements OnInit {
     private destroy$ = new Subject<void>();
     @Output() walletSelected = new EventEmitter<Wallet>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     wallets: Wallet[] = [];
     selectedWalletIndex = 0;
     currentWallet: Wallet = {
          classicAddress: '',
          address: '',
          seed: '',
          name: undefined,
          balance: '0',
          ownerCount: undefined,
          xrpReserves: undefined,
          spendableXrp: undefined,
     };
     hasWallets = false;
     environment = '';
     tempName = '';
     executionTime: string = '';
     editingIndex!: (index: number) => boolean;

     private cdr = inject(ChangeDetectorRef);

     constructor(private walletManagerService: WalletManagerService, private walletGenerator: WalletGeneratorService, private xrplService: XrplService, public copyUtilService: CopyUtilService, private walletDataService: WalletDataService, public ui: TransactionUiService) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          this.walletManagerService.wallets$.pipe(startWith(null), pairwise(), takeUntil(this.destroy$)).subscribe(([prev, curr]) => {
               this.wallets = curr || [];
               this.hasWallets = this.wallets.length > 0;
               this.selectedWalletIndex = Math.min(this.selectedWalletIndex, this.wallets.length - 1 || 0);
               this.updateCurrentWallet();
               this.cdr.detectChanges();
          });
     }

     private syncSelectedIndex() {
          this.walletManagerService.setSelectedIndex(this.selectedWalletIndex);
     }

     updateCurrentWallet() {
          if (this.wallets.length > 0) {
               this.currentWallet = { ...this.wallets[this.selectedWalletIndex] };
          }
     }

     selectWallet(index: number) {
          if (this.selectedWalletIndex === index) return;
          this.selectedWalletIndex = index;
          this.updateCurrentWallet();

          // Emit the newly selected wallet
          this.walletSelected.emit(this.currentWallet);
          this.syncSelectedIndex(); // ← ADD THIS
     }

     editName(i: number) {
          this.walletManagerService.startEdit(i);
          const wallet = this.wallets[i];
          this.tempName = wallet.name || `Wallet ${i + 1}`;
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
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          const client = await this.xrplService.getClient();
          await this.walletDataService.refreshWallets(client, this.wallets, this.selectedWalletIndex, [wallet.address]);
     }

     deleteWallet(index: number) {
          if (confirm('Delete this wallet? This cannot be undone.')) {
               this.walletManagerService.deleteWallet(index);
               this.updateCurrentWallet();
               this.walletSelected.emit(this.currentWallet);
               this.syncSelectedIndex(); // ← ADD THIS
          }
     }

     async generateNewAccount() {
          console.log('Entering generateNewAccount');
          const startTime = Date.now();
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               // Default to ed25519
               const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, AppConstants.ENCRYPTION.ED25519);
               const client = await this.xrplService.getClient();
               await this.walletDataService.refreshWallets(client, this.wallets, this.selectedWalletIndex, [faucetWallet.address]);
               this.ui.spinner = false;
               this.ui.clearWarning();
               this.syncSelectedIndex();
          } catch (error: any) {
               console.error('Error in generateNewAccount:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving generateNewAccount in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     dropWallet(event: CdkDragDrop<Wallet[]>) {
          moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);
          if (this.selectedWalletIndex === event.previousIndex) {
               this.selectedWalletIndex = event.currentIndex;
          } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
               this.selectedWalletIndex--;
          } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
               this.selectedWalletIndex++;
          }
          this.walletManagerService.setWallets(this.wallets);
          this.updateCurrentWallet();
          this.walletSelected.emit(this.currentWallet);
          this.syncSelectedIndex(); // ← ADD THIS
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }
}
