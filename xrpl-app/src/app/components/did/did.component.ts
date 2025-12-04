import { OnInit, Component, ElementRef, ViewChild, inject, TemplateRef, ChangeDetectionStrategy, signal, computed, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { DIDSet, DIDDelete } from 'xrpl';
import didSchema from './did-schema.json';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { Subject } from 'rxjs';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';

interface ValidationInputs {
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     destination?: string;
     didDocument?: string;
     didUri?: string;
     didData?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

interface DidItem {
     index: string;
     DIDDocument: string;
     Data: string;
     URI?: string;
}

interface DidData {
     id: string;
     verificationMethod: {
          id: string;
          type: string;
          controller: string;
          publicKeyBase58: string;
     };
     authentication: {
          auth: string;
     };
     service: {
          serviceId: string;
          serviceType: string;
          serviceEndpoint: string;
     };
     hash: string;
     uri: string;
     document: string;
     data: string;
     destinationAddress: string;
}

@Component({
     selector: 'app-did',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './did.component.html',
     styleUrl: './did.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);

     // Services
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     private readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     // ViewChildren & Template
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('credentialInput', { static: false }) inputElement!: ElementRef<HTMLInputElement>;

     // Reactive State (Signals)
     activeTab = signal<'set' | 'delete'>('set');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     hasWallets = computed(() => this.wallets().length > 0);

     // Form & UI State
     credentialSearchTerm = signal<string>('');
     destinationField = signal<string>('');
     infoPanelExpanded = signal(false);
     isRegularKeyAddress = signal<boolean>(false);
     regularKeyAddress = signal<string>('');
     regularKeySeed = signal<string>('');
     useMultiSign = signal<boolean>(false);
     multiSignAddress = signal<string>('');
     multiSignSeeds = signal<string>('');
     isTicket = signal<boolean>(false);
     selectedSingleTicket = signal<string>('');
     selectedTicket = signal<string>('');
     memoField = signal<string>('');
     isMemoEnabled = signal<boolean>(false);

     filteredDestinations = signal<DropdownItem[]>([]);
     highlightedIndex = signal<number>(-1);
     showDropdown = signal<boolean>(false);
     createdDids = signal<boolean>(false);
     existingDid = signal<DidItem[]>([]);

     // DID  Form Data
     didDetails = signal<DidData>({
          id: '',
          verificationMethod: {
               id: '',
               type: '',
               controller: '',
               publicKeyBase58: '',
          },
          authentication: {
               auth: '',
          },
          service: {
               serviceId: '',
               serviceType: '',
               serviceEndpoint: '',
          },
          hash: '',
          uri: 'ipfs://bafybeiexamplehash',
          document: '',
          data: '',
          destinationAddress: '',
     });

     url = signal<string>('');
     public destinationSearch$ = new Subject<string>();
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal<boolean>(false);
     signers = signal<{ account: string; seed: string; weight: number }[]>([{ account: '', seed: '', weight: 1 }]);
     signerQuorum = signal<number>(0);
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     ticketArray = signal<string[]>([]);
     masterKeyDisabled = signal<boolean>(false);
     credentialData = signal<string>('');
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     createdCredentials = signal<boolean>(true);
     subjectCredential = signal<boolean>(true);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     constructor() {
          super();
          this.txUiService.clearTxSignal();
          this.txUiService.clearTxResultSignal();
          effect(() => this.updateInfoMessage());
     }

     ngOnInit() {
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);
          this.setupWalletSubscriptions();
     }

     private setupWalletSubscriptions(): void {
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);

               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.currentWallet.set({ ...wallet });
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.currentWallet.set({ ...wallet });
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    this.getDidForAccount(false);
               }
          });
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     trackByTicket(index: number, ticket: any) {
          return ticket;
     }

     toggleCreatedDids() {
          this.createdDids.update(val => !val);
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign(), this.signers(), (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.txUiService.setError(`${error.message}`);
          }
     }

     copyDidIndex(didIndex: string) {
          navigator.clipboard.writeText(didIndex).then(() => {
               this.txUiService.showToastMessage('DID Index copied!');
          });
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
          this.updateInfoMessage(); // Rebuild the HTML with new state
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet.set({ ...wallet });
     }

     async setTab(tab: 'set' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.clearFields(true);
          await this.getDidForAccount();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getDidForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getDidForAccount', async () => {
               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length) {
                         this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         return;
                    }

                    this.getExistingDid(accountObjects, wallet.classicAddress);
                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.clearFields(true);
               } catch (error: any) {
                    console.error('Error in getDidForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async setDid() {
          await this.withPerf('setDid', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    useMultiSign: this.useMultiSign(),
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
                    didDocument: this.didDetails().document || undefined,
                    didUri: this.didDetails().uri || undefined,
                    didData: this.didDetails().data || undefined,
               };

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    inputs.accountInfo = accountInfo;

                    const errors = await this.validationService.validate('DIDSet', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    let didSetTx: DIDSet = {
                         TransactionType: 'DIDSet',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, didSetTx, wallet, accountInfo, 'DIDSet');

                    const result = await this.txExecutor.setDid(didSetTx, wallet, client, {
                         useMultiSign: this.useMultiSign(),
                         isRegularKeyAddress: this.isRegularKeyAddress(),
                         regularKeySeed: this.regularKeySeed(),
                         multiSignAddress: this.multiSignAddress(),
                         multiSignSeeds: this.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (this.txUiService.isSimulateEnabled) {
                         this.txUiService.successMessage = 'Simulated Set DID successfully!';
                    } else {
                         this.txUiService.successMessage = 'Set DID successfully!';
                         await this.refreshAfterTx(client, wallet, null, true);
                    }
               } catch (error: any) {
                    console.error('Error in setDid:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async deleteDid() {
          await this.withPerf('deleteDid', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    isRegularKeyAddress: this.isRegularKeyAddress(),
                    useMultiSign: this.useMultiSign(),
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
               };

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    inputs.accountInfo = accountInfo;
                    const errors = await this.validationService.validate('DIDdelete', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    const didFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'DID';
                    });

                    // If not found, exit early
                    if (!didFound) {
                         this.txUiService.setError('DID not found.');
                         return;
                    }

                    const didDeleteTx: DIDDelete = {
                         TransactionType: 'DIDDelete',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, didDeleteTx, wallet, accountInfo, 'deleteDID');

                    const result = await this.txExecutor.deleteDid(didDeleteTx, wallet, client, {
                         useMultiSign: this.useMultiSign(),
                         isRegularKeyAddress: this.isRegularKeyAddress(),
                         regularKeySeed: this.regularKeySeed(),
                         multiSignAddress: this.multiSignAddress(),
                         multiSignSeeds: this.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (this.txUiService.isSimulateEnabled) {
                         this.txUiService.successMessage = 'Simulated DID removal successfully!';
                    } else {
                         this.txUiService.successMessage = 'DID deleted successfully!';
                         await this.refreshAfterTx(client, wallet, null, true);
                    }
               } catch (error: any) {
                    console.error('Error in deleteDid:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     private getExistingDid(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'DID')
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         // CredentialType: obj.CredentialType ? this.decodeHex(obj.CredentialType) : 'Unknown Type',
                         DIDDocument: obj.DIDDocument ? JSON.stringify(JSON.parse(Buffer.from(obj.DIDDocument, 'hex').toString('utf8')), null, 2) : 'N/A',
                         Data: obj.Data ? JSON.stringify(JSON.parse(Buffer.from(obj.Data, 'hex').toString('utf8')), null, 2) : 'N/A',
                         URI: obj.URI ? JSON.stringify(JSON.parse(Buffer.from(obj.URI, 'hex').toString('utf8')), null, 2) : 'N/A',
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.existingDid.set(mapped);
          this.utilsService.logObjects('existingDid', mapped);
     }

     private async setTxOptionalFields(client: xrpl.Client, didTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'DIDSet') {
               if (this.didDetails().document) {
                    const didDocument = { didData: this.didDetails().document };
                    console.debug(`DID Document:`, didDocument);
                    const didDocumentHex = this.utilsService.jsonToHex(didDocument);
                    console.log(didDocumentHex);
                    didTx.DIDDocument = didDocumentHex;
               }

               if (this.didDetails().uri) {
                    const didURI = { uri: this.didDetails().uri };
                    console.debug(`DID URI:`, didURI);
                    const didURIHex = this.utilsService.jsonToHex(didURI);
                    console.log(didURIHex);
                    didTx.URI = didURIHex;
               }

               if (this.didDetails().data) {
                    const result = this.utilsService.validateAndConvertDidJson(this.didDetails().data, didSchema);

                    if (result.success) {
                         didTx.Data = result.hexData!;
                    } else {
                         throw new Error(result.errors ?? 'Unknown error');
                    }
               }
          }

          if (this.selectedSingleTicket()) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket()));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket()} not found`);
               this.utilsService.setTicketSequence(didTx, this.selectedSingleTicket(), true);
          } else if (this.multiSelectMode() && this.selectedTickets().length > 0) {
               console.log('Setting multiple tickets:', this.selectedTickets());
               this.utilsService.setTicketSequence(didTx, accountInfo.result.account_data.Sequence, false);
          }

          if (this.memoField()) this.utilsService.setMemoField(didTx, this.memoField());
     }

     private async refreshAfterTx(client: any, wallet: any, resolvedDestination: string | null, addNewDestinationFromUser: boolean) {
          try {
               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
               this.getExistingDid(accountObjects, wallet.classicAddress);
               resolvedDestination ? await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error) : await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
          } catch (error: any) {
               console.error('Error in refreshAfterTx:', error);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          const tickets = this.utilsService.getAccountTickets(accountObjects);
          this.ticketArray.update(() => [...tickets]);
          if (this.multiSelectMode()) {
               this.selectedSingleTicket.set(this.utilsService.cleanUpMultiSelection(this.selectedTickets(), tickets));
          } else {
               this.selectedSingleTicket.set(this.utilsService.cleanUpSingleSelection(this.selectedTickets(), tickets));
          }
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));
          this.selectedTicket.set(this.ticketArray()[0] || this.selectedTicket());
          // Signer accounts
          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          this.signerQuorum.set(signerQuorum);
          const hasSignerAccounts = signerAccounts?.length > 0;
          this.checkForMultiSigners(hasSignerAccounts, wallet);
          // Boolean flags
          this.multiSigningEnabled.set(hasSignerAccounts);
          this.useMultiSign.set(false);
          this.masterKeyDisabled.set(Boolean(accountInfo?.result?.account_flags?.disableMasterKey));
          this.clearFields(false);
     }

     private checkForMultiSigners(hasSignerAccounts: boolean, wallet: xrpl.Wallet) {
          if (hasSignerAccounts) {
               const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
               this.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
          } else {
               this.signerQuorum.set(0);
               this.multiSignAddress.set('No Multi-Sign address configured for account');
               this.multiSignSeeds.set('');
               this.storageService.removeValue('signerEntries');
          }
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;
          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;
          // Set regular key properties
          const rkProps = this.utilsService.setRegularKeyProperties(regularKey, accountData.Account) || { regularKeyAddress: 'No RegularKey configured for account', regularKeySeed: '', isRegularKeyAddress: false };
          this.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.regularKeySeed.set(rkProps.regularKeySeed);
          // Set master key property
          this.masterKeyDisabled.set(isMasterKeyDisabled);
          // Set regular key signing enabled flag
          this.regularKeySigningEnabled.set(!!regularKey);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet().encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     private updateInfoMessage(): void {
          if (!this.currentWallet().address) {
               this.txUiService.setInfoData(null);
               return;
          }

          const walletName = this.currentWallet().name || 'Selected wallet';
          this.txUiService.setInfoData({
               walletName,
               mode: this.activeTab(),
               didCount: this.existingDid().length,
               existingDid: this.existingDid(),
          });
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields(all = true) {
          if (all) {
               this.didDetails().document = '';
               this.didDetails().uri = '';
               this.didDetails().data = '';

               this.txUiService.successMessage = '';
               this.txUiService.clearTxSignal();
               this.txUiService.clearTxResultSignal();
               this.txUiService.isSimulateEnabled = false;
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }

          this.credentialSearchTerm.set('');
          this.isRegularKeyAddress.set(false);
          this.useMultiSign.set(false);
          this.isTicket.set(false);
          this.selectedTicket.set('');
          this.isMemoEnabled.set(false);
          this.memoField.set('');
     }
}
