import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { WalletGeneratorService } from '../generator/wallet-generator.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletsStoreService } from '../wallets-store/wallets-store.service';
import { WalletsUtilService } from '../wallets-util/wallets-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { AppConstants } from '../../../core/app.constants';
import { WalletFlowConfig } from '../../../components/wallet-configurator/constants/wallet-generator.types';

@Injectable({ providedIn: 'root' })
export class WalletConfiguratorOrchestratorService extends PerformanceBaseComponent {
     private readonly walletGenerator = inject(WalletGeneratorService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly walletsStoreService = inject(WalletsStoreService);
     private readonly walletsUtilService = inject(WalletsUtilService);
     private readonly toastService = inject(ToastService);
     private readonly transactionDropdownService = inject(TransactionDropdownService);
     private readonly storageService = inject(StorageService);

     public readonly executionTimeValue = this.executionTime.asReadonly();

     async executeWalletFlow(config: WalletFlowConfig): Promise<{ success: boolean; wallet?: any }> {
          return this.measure(config.perfLabel, false, async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();

               this.walletsStoreService.updateField('buttonLoading', s => ({
                    ...s,
                    [config.loadingKey]: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    const encryption = this.walletsUtilService.getEncryptionType();

                    if (config.validate) {
                         const errorMsg = config.validate();
                         if (errorMsg) {
                              this.toastService.error(errorMsg, AppConstants.TOAST.ERROR);
                              return { success: false };
                         }
                    }

                    const wallet = config.mode === 'generate' ? await this.walletGenerator.generateWallet(config.walletType, this.environment(), encryption, config.wordCount) : await this.walletGenerator.importWallet(config.walletType, config.input!(), encryption);

                    this.txUiService.setTxResultSignal(wallet);
                    this.toastService.success(config.successMessage(wallet.address), AppConstants.TOAST.SUCCESS, false);

                    return { success: true, wallet };
               } catch (error: any) {
                    this.handleWalletError(error);
                    return { success: false };
               } finally {
                    this.walletsStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         [config.loadingKey]: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     removeCustomWallet(address: string): { success: boolean; error?: string } {
          const currentCustoms = this.transactionDropdownService.customDestinations();
          if (!currentCustoms.some(w => w.address === address)) {
               return { success: false, error: 'Selected wallet not found in custom list' };
          }

          this.transactionDropdownService.customDestinations.update(list => list.filter(w => w.address !== address));
          const updated = this.transactionDropdownService.customDestinations();
          this.storageService.set('customDestinations', JSON.stringify(updated));

          this.toastService.success(`Custom wallet ${address} removed successfully`);
          return { success: true };
     }

     private handleWalletError(error: any): void {
          console.error(error);
          if (error?.message?.includes('Account not found')) {
               this.toastService.error(`${error.message} Are you using the correct encryption?`, AppConstants.TOAST.ERROR);
          } else {
               this.toastService.error(error?.message || 'Unknown error', AppConstants.TOAST.ERROR);
          }
     }
}
