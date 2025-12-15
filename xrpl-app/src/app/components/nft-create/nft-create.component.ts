import { OnInit, Component, inject, computed, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { NFTokenMint, NFTokenBurn, NFTokenModify } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';

interface AccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAllowTrustLineClawback: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineLocking: boolean;
}

interface NftFlags {
     burnableNft: boolean;
     onlyXrpNft: boolean;
     trustLine: boolean;
     transferableNft: boolean;
     mutableNft: boolean;
}

interface BactchFlags {
     canLock: boolean;
     canClawback: boolean;
     isRequireAuth: boolean;
     canTransfer: boolean;
     canTrade: boolean;
     canEscrow: boolean;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-nft-create',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './nft-create.component.html',
     styleUrl: './nft-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateNftComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);

     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'create' | 'burn' | 'updateNFTMetadata'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     sourceTagField = signal<string>('');
     invoiceIdField = signal<string>('');
     currencyFieldDropDownValue = signal<string>('XRP');
     checkExpirationTime = signal<string>('seconds');
     issuerFields = signal<string>('');
     expirationTimeField = signal<string>('');
     ticketSequence = signal<string>('');
     checkIdField = signal<string>('');
     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal(false);
     selectedWalletIndex = signal<number>(0);
     isTicketEnabled = signal<boolean>(false);
     existingMpts = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);
     existingMptsCollapsed = signal<boolean>(true);
     outstandingIOUCollapsed = signal<boolean>(true);
     metaDataField = signal<string>('');
     tokenCountField = signal<string>('');
     assetScaleField = signal<string>('');
     isdepositAuthAddress = signal<boolean>(false);
     isMptFlagModeEnabled = signal<boolean>(false);
     transferFeeField = signal<string>('');
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     currencyBalanceField = signal<string>('0');
     gatewayBalance = signal<string>('0');
     private readonly knownTrustLinesIssuers = signal<{ [key: string]: string[] }>({ XRP: [] });
     issuerToRemove = signal<string>('');
     currencies = signal<string[]>([]);
     userAddedCurrencyFieldDropDownValue = signal<string[]>([]);
     userAddedissuerFields = signal<string>('');
     allKnownIssuers = signal<string[]>([]);
     storedIssuers = signal<IssuerItem[]>([]);
     selectedIssuer = signal<string>('');
     newCurrency = signal<string>('');
     newIssuer = signal<string>('');
     tokenToRemove = signal<string>('');
     showTrustlineOptions = signal<boolean>(false);
     issuers = signal<{ name?: string; address: string }[]>([]);
     lastCurrency = signal<string>('');
     lastIssuer = signal<string>('');
     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     showManageTokens = signal<boolean>(false);
     encryptionType = signal<string>('');
     accountTrustlines = signal<any[]>([]);
     isUpdateMetaData = signal<boolean>(false);
     isUpdateNFTMetaData = signal<boolean>(false);
     isBatchModeEnabled = signal<boolean>(false);
     isNftFlagModeEnabled = signal<boolean>(false);
     isSubmitSignedTransactionEnabled = signal<boolean>(false);
     isDestinationEnabled = signal<boolean>(false);
     signedTransactionField = signal<string>('');
     isAuthorizedNFTokenMinter = signal<boolean>(false);
     isNFTokenMinterEnabled = signal<boolean>(false);
     nfTokenMinterAddress = signal<string>('');
     tickSize = signal<string>('');
     // selectedNft = signal<string | null>(null);
     isMessageKey = signal<boolean>(false);
     destinationFields = signal<string>('');
     newDestination = signal<string>('');
     tokenBalance = signal<string>('0');
     currencyIssuers: string[] = [];
     domain = signal<string>('');
     memo = signal<string>('');
     taxonField = signal<string>('');
     burnableNft = signal<{ checked: any } | undefined>(undefined);
     onlyXrpNft = signal<{ checked: any } | undefined>(undefined);
     transferableNft = signal<{ checked: any } | undefined>(undefined);
     mutableNft = signal<{ checked: any } | undefined>(undefined);
     batchMode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent' = 'allOrNothing';
     minterAddressField = signal<string>('');
     issuerAddressField = signal<string>('');
     expirationField = signal<string>('');
     expirationTimeUnit = signal<string>('seconds');
     // uriField: string = 'https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq';
     // uriField: string = 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjhubGpubms0bXl5ZzM0cWE4azE5aTlyOHRyNmVhd2prcDc1am43ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NxwglXLqMeOuRF3FHv/giphy.gif';
     // uriField = signal<string>('https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq');
     initialURIField = signal<string>('https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq');
     nftIdField = signal<string>('');
     nftIndexField = signal<string>('');
     nftCountField = signal<string>('');
     private nftFlagValues = {
          burnableNft: 0x00000001,
          onlyXrpNft: 0x00000002,
          trustLine: 0x00000004,
          transferableNft: 0x00000008,
          mutableNft: 0x00000010,
     };
     nftFlags: NftFlags = {
          burnableNft: false,
          onlyXrpNft: false,
          trustLine: false,
          transferableNft: false,
          mutableNft: false,
     };
     flags: AccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAllowTrustLineClawback: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineLocking: false,
     };
     existingNfts = signal<any[]>([]);
     existingNftsCollapsed = signal<boolean>(true);
     nftOwnerAddress = signal<string>('');

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.destinations().map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
          }));
     });

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     hasWallets = computed(() => this.wallets().length > 0);

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;

          const nfts = this.existingNfts();
          const count = nfts.length;

          const links = count > 0 ? `<a href="${baseUrl}account/${address}/nfts" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View NFTs</a>` : '';

          const nftsToShow = this.infoPanelExpanded()
               ? nfts.map((nft: { NFTokenID: any; URI: any; Taxon: any; Sequence: any; TransferFee: any; Flags: any }) => ({
                      id: nft.NFTokenID,
                      uri: nft.URI,
                      taxon: nft.Taxon,
                      sequence: nft.Sequence,
                      transferFee: nft.TransferFee,
                      flags: this.decodeNftFlagsForUi(nft.Flags || 0),
                 }))
               : [];

          return {
               walletName,
               activeTab: this.activeTab(),
               nftCount: count,
               nftsToShow,
               links,
          };
     });

     // NFT Dropdown Items
     nftItems = computed(() => {
          return this.existingNfts().map((nft: { NFTokenID: string; URI: any }) => ({
               id: nft.NFTokenID,
               display: nft.URI ? `NFT • ${nft.URI}` : 'NFT • No URI',
               secondary: nft.NFTokenID.slice(0, 12) + '...' + nft.NFTokenID.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     selectedNftItem = computed(() => {
          const id = this.nftIdField();
          if (!id) return null;
          return this.nftItems().find((i: { id: string }) => i.id === id) || null;
     });

     onNftSelected(item: SelectItem | null) {
          this.nftIdField.set(item?.id || '');
     }

     timeUnitItems = computed(() => [
          { id: 'seconds', display: 'Seconds' },
          { id: 'minutes', display: 'Minutes' },
          { id: 'hours', display: 'Hours' },
          { id: 'days', display: 'Days' },
     ]);

     selectedTimeUnitItem = computed(() => {
          const unit = this.expirationTimeUnit();
          return this.timeUnitItems().find(i => i.id === unit) || null;
     });

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.(); // or just clear messages when appropriate
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) {
                         this.clearFields(true);
                         this.selectWallet(wallet);
                    }
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.clearFields(true);
                    await this.getNFT(true);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Clear NFT state when switching wallets
          this.existingNfts.set([]);
          this.nftIdField.set('');
          // this.selectedNft = null;

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     toggleExistingNfts() {
          this.existingNftsCollapsed.set(!this.existingNftsCollapsed);
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(v => !v);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: 'create' | 'burn' | 'updateNFTMetadata'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.resetFlags();
          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getNFT(true);
          }
     }

     toggleFlags() {}

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getNFT(forceRefresh = false): Promise<void> {
          await this.withPerf('getNFT', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);
                    const accountNfts = await this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } }));
                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });

                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingNfts(accountNfts, this.currentWallet().address);

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async mintNFT() {
          await this.withPerf('mintNFT', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               if (this.flags.asfNoFreeze && this.flags.asfGlobalFreeze) {
                    return this.txUiService.setError('ERROR: Cannot enable both NoFreeze and GlobalFreeze');
               }

               const nftFlags = this.getFlagsValue(this.nftFlags);

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = this.validateInputs(inputs, 'mintNFT');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const nFTokenMintTx: NFTokenMint = {
                         TransactionType: 'NFTokenMint',
                         Account: wallet.classicAddress,
                         Flags: nftFlags,
                         NFTokenTaxon: parseInt(this.taxonField(), 0),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, nFTokenMintTx, wallet, accountInfo, 'mint');

                    const result = await this.txExecutor.mintNft(nFTokenMintTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated NFT mint successfully!' : 'Minted NFT executed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in mintNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     // async mintBatchNFT() {
     //      await this.withPerf('mintBatchNFT', async () => {
     //           this.txUiService.clearAllOptionsAndMessages();
     //           if (!this.isBatchModeEnabled) {
     //                return this.ui.setError('Batch Mode slider is not enabled.');
     //           }

     //           let nftFlags = 0;
     //           // if (this.isNftFlagModeEnabled) {
     //           nftFlags = this.getFlagsValue(this.nftFlags);
     //           // }
     //           const batchFlags = this.setBatchFlags();

     //           try {
     //                const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

     //                const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
     //                // this.utilsService.logAccountInfoObjects(accountInfo, null);
     //                // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

     //                inputs.accountInfo = accountInfo;

     //                const errors = this.validateInputs(inputs, 'batchNFT');
     //                if (errors.length > 0) {
     //                     return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
     //                }

     //                let { regularKeyWalletSignTx }: { useRegularKeyWalletSignTx: boolean; regularKeyWalletSignTx: any } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

     //                const transactions: NFTokenMint[] = [];
     //                for (let i = 0; i < parseInt(this.nftCountField); i++) {
     //                     transactions.push({
     //                          TransactionType: 'NFTokenMint',
     //                          Account: wallet.classicAddress,
     //                          URI: xrpl.convertStringToHex(this.initialURIField),
     //                          Flags: nftFlags | AppConstants.TF_INNER_BATCH_TXN.BATCH_TXN, // Combine existing flags with tfInnerBatchTxn
     //                          NFTokenTaxon: parseInt(this.taxonField, 10),
     //                          Fee: '0', // Fee must be "0" for inner transactions
     //                     });
     //                }

     //                let response: any;

     //                if (transactions.length === 1) {
     //                     // Normal NFTokenMint (no batch needed)
     //                     const singleTx: NFTokenMint = {
     //                          ...transactions[0],
     //                          Flags: nftFlags, // remove tfInnerBatchTxn when it's standalone
     //                          Fee: fee,
     //                     };

     //                     const prepared = await client.autofill(singleTx);
     //                     response = await client.submitAndWait(prepared, { wallet });
     //                } else {
     //                     // Batch submit if > 1
     //                     if (this.useMultiSign) {
     //                          response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, {
     //                               isMultiSign: true,
     //                               signerAddresses: this.multiSignAddress,
     //                               signerSeeds: this.multiSignSeeds,
     //                               fee: '12', // optional override
     //                          });
     //                     } else {
     //                          response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, { useRegularKeyWalletSignTx: regularKeyWalletSignTx });
     //                     }
     //                }

     //                // this.utilsService.logObjects('response', response);
     //                // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

     //                this.ui.setTxResult(response.result);
     //                this.updateTxResult();

     //                const isSuccess = this.utilsService.isTxSuccessful(response);
     //                if (!isSuccess) {
     //                     const resultMsg = this.utilsService.getTransactionResultMessage(response);
     //                     const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

     //                     console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
     //                     (response.result as any).errorMessage = userMessage;
     //                     return this.ui.setError(userMessage);
     //                } else {
     //                     this.ui.setSuccess(this.ui.result);
     //                }

     //                this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

     //                if (!this.ui.isSimulateEnabled()) {
     //                     this.ui.successMessage = 'Minted Batch NFT successfully!';
     //                     const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

     //                     await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

     //                     this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
     //                     this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
     //                     this.updateTickets(updatedAccountObjects);
     //                     this.clearFields(false);
     //                     this.updateInfoMessage();
     //                     this.cdr.detectChanges();
     //                } else {
     //                     this.ui.successMessage = 'Simulated NFT Batch Mint successfully!';
     //                }
     //           } catch (error: any) {
     //                console.error('Error in mintBatchNFT:', error);
     //                this.txUiService.setError(`${error.message || 'Transaction failed'}`);
     //           } finally {
     //                this.txUiService.spinner.set(false);
     //           }
     //      });
     // }

     async burnNFT() {
          await this.withPerf('burnNFT', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.destination = resolvedDestination;
                    // inputs.accountInfo = accountInfo;

                    // const errors = this.validateInputs(inputs, 'burnNFT');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const validNFTs = this.utilsService.parseAndValidateNFTokenIDs(this.nftIdField());
                    if (!validNFTs) {
                         return this.txUiService.setError(`Invalid NFT Id`);
                    }

                    if (validNFTs.length > 1) {
                         return this.txUiService.setError(`Use Batch Mode to burn multiple NFT's at once.`);
                    }

                    const nFTokenBurnTx: NFTokenBurn = {
                         TransactionType: 'NFTokenBurn',
                         Account: wallet.classicAddress,
                         NFTokenID: this.nftIdField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, nFTokenBurnTx, wallet, accountInfo, 'burn');

                    const result = await this.txExecutor.burnNft(nFTokenBurnTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Burned NFT successfully!' : 'Burned NFT executed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.nftIdField.set('');
               } catch (error: any) {
                    console.error('Error in burnNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     // async burnBatchNFT() {
     //      await this.withPerf('burnBatchNFT', async () => {
     //           this.txUiService.clearAllOptionsAndMessages();

     //           const validNFTs = this.utilsService.parseAndValidateNFTokenIDs(this.nftIdField());
     //           if (!validNFTs) {
     //                return this.txUiService.setError(`Invalid NFT Id`);
     //           }

     //           const nftIds = this.utilsService.getNftIds(this.nftIdField);
     //           const batchFlags = this.setBatchFlags();

     //           try {
     //                const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

     //                const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
     //                // this.utilsService.logAccountInfoObjects(accountInfo, null);
     //                // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

     //                // inputs.accountInfo = accountInfo;

     //                // const errors = this.validateInputs(inputs, 'batchBurnNFT');
     //                // if (errors.length > 0) {
     //                //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
     //                // }

     //                let { regularKeyWalletSignTx }: { useRegularKeyWalletSignTx: boolean; regularKeyWalletSignTx: any } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

     //                const transactions: any[] = nftIds.map((nftId: any) => ({
     //                     TransactionType: 'NFTokenBurn',
     //                     Account: wallet.classicAddress,
     //                     NFTokenID: nftId,
     //                     Flags: AppConstants.TF_INNER_BATCH_TXN.BATCH_TXN, // 1073741824
     //                     Fee: '0',
     //                }));

     //                let response: any;

     //                if (transactions.length === 1) {
     //                     // Normal NFTokenBurn (no batch needed)
     //                     const singleTx: NFTokenBurn = {
     //                          ...transactions[0],
     //                          Fee: undefined, // let autofill set correct fee
     //                          Flags: fee,
     //                     };

     //                     const prepared = await client.autofill(singleTx);
     //                     console.log(`Single-sign batch:`, prepared);
     //                     response = await client.submitAndWait(prepared, { wallet });
     //                     console.log(`response:`, response);
     //                } else {
     //                     // Batch submit if > 1
     //                     if (this.useMultiSign) {
     //                          response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, {
     //                               isMultiSign: true,
     //                               signerAddresses: this.multiSignAddress,
     //                               signerSeeds: this.multiSignSeeds,
     //                               fee: '12', // optional override
     //                          });
     //                     } else {
     //                          response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, { useRegularKeyWalletSignTx: regularKeyWalletSignTx });
     //                     }
     //                }

     //                // this.utilsService.logObjects('response', response);
     //                // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

     //                this.ui.setTxResult(response.result);
     //                this.updateTxResult();

     //                const isSuccess = this.utilsService.isTxSuccessful(response);
     //                if (!isSuccess) {
     //                     const resultMsg = this.utilsService.getTransactionResultMessage(response);
     //                     const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

     //                     console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
     //                     (response.result as any).errorMessage = userMessage;
     //                     return this.ui.setError(userMessage);
     //                } else {
     //                     this.ui.setSuccess(this.ui.result);
     //                }

     //                this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

     //                if (!this.ui.isSimulateEnabled()) {
     //                     this.ui.successMessage = 'Burned NFT executed successfully!';
     //                     const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

     //                     await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

     //                     this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
     //                     this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
     //                     this.updateTickets(updatedAccountObjects);
     //                     this.clearFields(false);
     //                     this.updateInfoMessage();
     //                     this.cdr.detectChanges();
     //                } else {
     //                     this.ui.successMessage = 'Simulated Burned Batch NFT successfully!';
     //                }
     //           } catch (error: any) {
     //                console.error('Error in burnBatchNFT:', error);
     //                this.txUiService.setError(`${error.message || 'Transaction failed'}`);
     //           } finally {
     //                this.txUiService.spinner.set(false);
     //           }
     //      });
     // }

     async updateNFTMetadata() {
          await this.withPerf('updateNFTMetadata', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo, nftInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } }))]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
                    this.utilsService.logObjects('nftInfo', nftInfo);

                    // inputs.accountInfo = accountInfo;
                    // inputs.nft_info = nftInfo;

                    // const errors = this.validateInputs(inputs, 'updateMetadata');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const nFTokenModifyTx: NFTokenModify = {
                         TransactionType: 'NFTokenModify',
                         Account: wallet.classicAddress,
                         NFTokenID: this.nftIdField(),
                         URI: xrpl.convertStringToHex(this.initialURIField()),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, nFTokenModifyTx, wallet, accountInfo, 'updateMetaData');

                    const result = await this.txExecutor.updateNftMetaData(nFTokenModifyTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Update NFT Meta Data successfully!' : 'Updated NFT Meta Data successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in updateNFTMetadata:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingNfts(checkObjects: any, classicAddress: string) {
          // Accept either:
          // - whole response object with .result.account_nfts
          // - OR an array of NFT objects directly
          const raw = Array.isArray(checkObjects) ? checkObjects : checkObjects?.result?.account_nfts ?? [];

          const allNfts = (raw as any[]).flatMap((pageOrNft: any) => {
               // Case A: page object that contains .NFTokens (each entry may be { NFToken: { ... } })
               if (pageOrNft && Array.isArray(pageOrNft.NFTokens)) {
                    return pageOrNft.NFTokens.map((entry: any) => {
                         const nft = entry?.NFToken ?? entry ?? {};
                         return this.normalizeNft(pageOrNft, nft);
                    });
               }

               // Case B: element is already an NFT object (your sample)
               // e.g. { NFTokenID, Issuer, NFTokenTaxon or NFTaxon, nft_serial, ... }
               if (pageOrNft && (pageOrNft.NFTokenID || pageOrNft.nft_serial || pageOrNft.Issuer)) {
                    // treat the element itself as the NFT
                    return [this.normalizeNft(null, pageOrNft)];
               }

               // Unknown shape -> skip
               return [];
          });

          this.existingNfts.set(allNfts);
          this.utilsService.logObjects('existingNfts', this.existingNfts());
          return this.existingNfts();
     }

     /** Normalize fields into consistent shape */
     private normalizeNft(page: any | null, nft: any) {
          const get = <T = any>(...keys: string[]) => {
               for (const k of keys) {
                    if (nft?.[k] !== undefined) return nft[k] as T;
                    if (page?.[k] !== undefined) return page[k] as T;
               }
               return undefined as unknown as T;
          };

          // NFTokenID can be at nft.NFTokenID or nft.NFTokenID (already)
          const nfTokenId = get<string>('NFTokenID', 'NFTokenId') ?? 'N/A';

          // Flags numeric (default 0)
          const flags = get<number>('Flags') ?? 0;

          // Issuer
          const issuer = get<string>('Issuer') ?? 'N/A';

          // Taxon may appear as NFTokenTaxon, NFTaxon, Taxon
          const taxon = get<number>('NFTokenTaxon', 'NFTaxon', 'Taxon') ?? 'N/A';

          // TransferFee
          const transferFee = get<number | string>('TransferFee') ?? 'N/A';

          // Sequence or nft_serial may exist
          const sequence = get<number | string>('Sequence', 'nft_serial') ?? 'N/A';

          // URI: sometimes hex string under URI; if absent we set 'N/A'
          const uriHex = get<string>('URI') ?? get<string>('uri') ?? 'N/A';
          const uriDecoded = uriHex && uriHex !== 'N/A' ? this.utilsService.decodeHex(uriHex) : null;

          return {
               LedgerEntryType: page?.LedgerEntryType ?? nft?.LedgerEntryType ?? 'N/A',
               PageIndex: page?.index ?? page?.PageIndex ?? 'N/A',
               NFTokenID: nfTokenId,
               Flags: flags,
               Issuer: issuer,
               Taxon: taxon,
               TransferFee: transferFee,
               Sequence: sequence,
               URI_hex: uriHex,
               URI: uriDecoded,
          };
     }

     toggleFlag(key: 'burnableNft' | 'onlyXrpNft' | 'transferableNft' | 'mutableNft' | 'trustLine') {
          this.nftFlags[key] = !this.nftFlags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.nftFlags.burnableNft) sum |= this.nftFlagValues.burnableNft;
          if (this.nftFlags.onlyXrpNft) sum |= this.nftFlagValues.onlyXrpNft;
          if (this.nftFlags.transferableNft) sum |= this.nftFlagValues.transferableNft;
          if (this.nftFlags.mutableNft) sum |= this.nftFlagValues.mutableNft;
          if (this.nftFlags.trustLine) sum |= this.nftFlagValues.trustLine;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     decodeNftFlags(flags: number): string[] {
          if (!flags) return [];

          const results = [];

          if (flags & 0x0001) results.push('tfBurnable');
          if (flags & 0x0002) results.push('tfOnlyXRP');
          if (flags & 0x0004) results.push('tfTrustLine');
          if (flags & 0x0008) results.push('tfTransferable');
          if (flags & 0x0010) results.push('tfMutable');

          return results;
     }

     private getFlagsValue(flags: NftFlags): number {
          let v_flags = 0;
          if (flags.burnableNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfBurnable;
          }
          if (flags.onlyXrpNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfOnlyXRP;
          }
          if (flags.transferableNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfTransferable;
          }
          if (flags.mutableNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfMutable;
          }
          if (flags.trustLine) {
               v_flags |= xrpl.NFTokenMintFlags.tfTrustLine;
          }
          return v_flags;
     }

     resetFlags() {
          this.nftFlags.burnableNft = false;
          this.nftFlags.onlyXrpNft = false;
          this.nftFlags.transferableNft = false;
          this.nftFlags.mutableNft = false;
          this.nftFlags.trustLine = false;
     }

     decodeNftFlagsForUi(flags: number): string {
          const flagDefinitions = [
               { value: 1, name: 'burnableNft' },
               { value: 2, name: 'onlyXrpNft' },
               { value: 4, name: 'trustLine' },
               { value: 8, name: 'transferableNft' },
               { value: 16, name: 'mutableNft' },
          ];

          const activeFlags: string[] = [];

          for (const flag of flagDefinitions) {
               if ((flags & flag.value) === flag.value) {
                    activeFlags.push(flag.name);
               }
          }

          return activeFlags.length > 0 ? activeFlags.join(', ') : 'None';
     }

     setBatchFlags() {
          let flags = 0;
          if (this.batchMode === 'allOrNothing') {
               flags |= AppConstants.BATCH_FLAGS.ALL_OR_NOTHING;
          }

          if (this.batchMode === 'onlyOne') {
               flags |= AppConstants.BATCH_FLAGS.ONLY_ONE;
          }

          if (this.batchMode === 'untilFailure') {
               flags |= AppConstants.BATCH_FLAGS.UNTIL_FAILURE;
          }

          if (this.batchMode === 'independent') {
               flags |= AppConstants.BATCH_FLAGS.INDEPENDENT;
          }

          console.log('Batch flags ' + flags);
          return flags;
     }

     get availableCurrencies(): string[] {
          return Object.keys(this.knownTrustLinesIssuers())
               .filter(c => c !== 'XRP')
               .sort((a, b) => a.localeCompare(b));
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, nftTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(nftTx, ticket, true);
               }
          }

          // --- Helper: set expiration ---
          const setExpiration = (): boolean => {
               if (this.expirationField()) {
                    const expireTime = this.utilsService.addTime(this.expirationField(), 'hours');
                    this.utilsService.setExpiration(nftTx, expireTime);
                    return true;
               }
               return false;
          };

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(nftTx, this.txUiService.memoField());
          }

          // --- Type-specific logic ---
          if (txType === 'mint') {
               if (this.initialURIField()) this.utilsService.setURI(nftTx, this.initialURIField());

               if (this.transferFeeField()?.trim()) this.utilsService.setTransferFee(nftTx, this.transferFeeField());

               if (this.nfTokenMinterAddress()) {
                    if (!xrpl.isValidAddress(this.nfTokenMinterAddress())) {
                         throw new Error('Invalid AuthorizedNFTokenMinter account');
                    }
                    this.utilsService.setIssuerAddress(nftTx, this.nfTokenMinterAddress());
               }

               let needsAmount = setExpiration();

               const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
               if (destinationAddress) {
                    this.utilsService.setDestination(nftTx, destinationAddress);
                    needsAmount = true;
               }

               if (needsAmount && this.amountField) {
                    this.utilsService.setAmount(nftTx, this.amountField);
               }
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          const accountNfts = await this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } }));
          this.getExistingNfts(accountNfts, wallet.classicAddress);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination || '');
          this.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     private clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     updateDestinations() {
          // Optional: persist destinations
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
          this.ensureDefaultNotSelected();
     }

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet().address;
          if (currentAddress && this.destinations().length > 0) {
               if (!this.destinations() || this.destinationField() === currentAddress) {
                    const nonSelectedDest = this.destinations().find((d: { address: string }) => d.address !== currentAddress);
                    this.selectedDestinationAddress.set(nonSelectedDest ? nonSelectedDest.address : this.destinations()[0].address);
               }
          }
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     setBatchMode(mode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent') {
          this.batchMode = mode;
          this.toggleFlags(); // optional: update your XRPL batch flags
     }

     onBurnToggle(checked: boolean, nftId: string) {
          // normalize current ids
          const ids = (this.nftIdField() || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (checked) {
               if (!ids.includes(nftId)) ids.push(nftId);
          } else {
               // remove
               const idx = ids.indexOf(nftId);
               if (idx !== -1) ids.splice(idx, 1);
          }

          this.nftIdField.set(ids.join(', '));
     }

     updateNftTextField(nftId: string, add: boolean) {
          let ids = (this.nftIdField() || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (add && !ids.includes(nftId)) {
               ids.push(nftId);
          } else if (!add) {
               ids = ids.filter(id => id !== nftId);
          }

          this.nftIdField.set(ids.join(', '));
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     copyNFTokenID(NFTokenID: string) {
          navigator.clipboard.writeText(NFTokenID).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               // this.initialURIField.set('');
               // this.uriField.set('');
               this.isBatchModeEnabled.set(false);
               this.isNftFlagModeEnabled.set(false);
               this.isNftFlagModeEnabled.set(false);
          }

          this.expirationTimeUnit.set('seconds');
          this.amountField.set('');
          this.minterAddressField.set('');
          this.issuerAddressField.set('');
          this.expirationField.set('');
          this.nftIdField.set('');
          this.nftIndexField.set('');
          this.nftCountField.set('');
          this.ticketSequence.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }
}
