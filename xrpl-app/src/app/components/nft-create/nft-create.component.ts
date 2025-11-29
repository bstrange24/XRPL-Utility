import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, NgZone } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { NFTokenMint, TransactionMetadataBase, NFTokenBurn, NFTokenModify } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { BatchService } from '../../services/batch/batch-service.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
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
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';

declare var Prism: any;

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     destination?: string;
     nft_info?: any;
     nftIdField?: string;
     uri?: string;
     batchMode?: string;
     amount?: string;
     nftIndexField?: string;
     nftCountField?: string;
     issuerAddressField?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     ticketSequence?: string;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

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

//  setNftFlags() {
//           let flags = 0;
//           if (this.burnableNft) {
//                flags |= xrpl.NFTokenMintFlags.tfBurnable;
//           }

//           if (this.onlyXrpNft) {
//                flags |= xrpl.NFTokenMintFlags.tfOnlyXRP;
//           }

//           if (this.transferableNft) {
//                flags |= xrpl.NFTokenMintFlags.tfTransferable;
//           }

//           if (this.mutableNft) {
//                flags |= xrpl.NFTokenMintFlags.tfMutable;
//           }

//           console.log('NFt flags ' + flags);
//           return flags;
//      }

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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './nft-create.component.html',
     styleUrl: './nft-create.component.css',
})
export class CreateNftComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'create';
     amountField = '';
     destinationField: string = '';
     destinationTagField = '';
     sourceTagField = '';
     invoiceIdField = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     isRegularKeyAddress: boolean = false;
     isTicket: boolean = false;
     selectedSingleTicket: string = '';
     selectedTickets: string[] = [];
     multiSelectMode: boolean = false;
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     selectedTicket: string = '';

     // Wallet state (now driven by WalletPanelComponent via service)
     currentWallet: Wallet = {} as Wallet;
     wallets: Wallet[] = [];
     hasWallets: boolean = true;
     environment = '';
     url = '';
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;

     // Multi-sign & Regular Key
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     regularKeyAddress: string = '';
     regularKeySeed: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     ticketArray: string[] = [];
     masterKeyDisabled: boolean = false;

     // Dropdown
     private overlayRef: OverlayRef | null = null;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];

     // Code preview
     private lastPaymentTx = '';
     private lastTxResult = '';
     executionTime = '';

     // NFT Create Specific
     issuerFields: string = '';
     currencyBalanceField: string = '';
     gatewayBalance: string = '';
     ticketSequence: string = '';
     outstandingChecks: string = '';
     private knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
     userAddedissuerFields: string = '';
     allKnownIssuers: string[] = [];
     storedIssuers: IssuerItem[] = [];
     selectedIssuer: string = '';
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     showTrustlineOptions: boolean = false;
     selectedWalletIndex: number = 0;
     issuers: { name?: string; address: string }[] = [];
     lastCurrency: string = '';
     lastIssuer: string = '';
     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     showManageTokens = false;
     encryptionType: string = '';
     accountTrustlines: any = [];
     existingMpts: any = [];
     existingIOUs: any = [];
     existingMptsCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     isUpdateMetaData: boolean = false;
     isUpdateNFTMetaData: boolean = false;
     isBatchModeEnabled: boolean = false;
     isNftFlagModeEnabled: boolean = false;
     isSubmitSignedTransactionEnabled: boolean = false;
     isDestinationEnabled: boolean = false;
     signedTransactionField: string = '';
     isAuthorizedNFTokenMinter: boolean = false;
     isNFTokenMinterEnabled: boolean = false;
     nfTokenMinterAddress: string = '';
     tickSize: string = '';
     transferFeeField: string = '';
     selectedNft: string | null = null; // stores NFTokenID
     isMessageKey: boolean = false;
     destinationFields: string = '';
     newDestination: string = '';
     tokenBalance: string = '0';
     currencyIssuers: string[] = [];
     domain: string = '';
     memo: string = '';
     isTicketEnabled: boolean = false;
     taxonField: string = '';
     burnableNft: { checked: any } | undefined;
     onlyXrpNft: { checked: any } | undefined;
     transferableNft: { checked: any } | undefined;
     mutableNft: { checked: any } | undefined;
     batchMode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent' = 'allOrNothing';
     minterAddressField: string = '';
     issuerAddressField: string = '';
     expirationField: string = '';
     expirationTimeUnit: string = 'seconds';
     // uriField: string = 'https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq';
     // uriField: string = 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjhubGpubms0bXl5ZzM0cWE4azE5aTlyOHRyNmVhd2prcDc1am43ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NxwglXLqMeOuRF3FHv/giphy.gif';
     uriField: string = '';
     initialURIField: string = '';
     nftIdField: string = '';
     nftIndexField: string = '';
     nftCountField: string = '';
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
     private burnCheckboxHandlerBound!: (e: Event) => void;
     totalFlagsValue = 0;
     totalFlagsHex = '0x0';
     existingNfts: any = [];
     existingNftsCollapsed: boolean = true;
     filterQuery: string = '';
     nftOwnerAddress: string = '';

     constructor(
          private xrplService: XrplService,
          private utilsService: UtilsService,
          private ngZone: NgZone,
          private storageService: StorageService,
          private readonly batchService: BatchService,
          private xrplTransactions: XrplTransactionService,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef
     ) {
          this.burnCheckboxHandlerBound = (e: Event) => this.burnCheckboxHandler(e);
     }

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;

          // Listen to selected wallet changes (critical!)
          this.walletManagerService.selectedIndex$.pipe(takeUntil(this.destroy$)).subscribe(index => {
               if (this.wallets[index]) {
                    this.currentWallet = { ...this.wallets[index] };
                    // this.getNFT();
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // If panel hasn't emitted yet (e.g. on page load), set current wallet manually
               if (wallets.length > 0 && !this.currentWallet.address) {
                    const index = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    this.currentWallet = { ...wallets[index] };
                    this.getNFT();
               }

               this.updateDestinations();
          });

          // Load custom destinations
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];
          this.updateDestinations();

          // Dropdown service sync
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => {
               this.destinationDropdownService.filter(query);
          });
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               open ? this.openDropdownInternal() : this.closeDropdownInternal();
          });
     }

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     ngOnDestroy(): void {
          document.removeEventListener('change', this.burnCheckboxHandlerBound);
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     onSelectNft(nftId: string | null) {
          this.selectedNft = nftId;
          this.nftIdField = nftId ?? '';
     }

     toggleExistingNfts() {
          this.existingNftsCollapsed = !this.existingNftsCollapsed;
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign, this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.ui.setError(`${error.message}`);
          }
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet = { ...wallet };

          // Prevent self-destination
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address || this.destinationField;
          if (currentDest === wallet.address) {
               this.destinationField = '';
          }

          this.getNFT();
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.selectedNft = null;
          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
          this.updateInfoMessage();
     }

     onAuthorizedNFTokenMinter() {
          this.cdr.detectChanges();
     }

     toggleFlags() {}

     async getNFT() {
          console.log('Entering getNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountNfts, accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logObjects('accountNfts', accountNfts);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getExistingNfts(accountObjects, this.currentWallet.address);

               // Prepare data structure
               // const data = {
               //      sections: [{}],
               // };
               // const nfts = accountNfts.result.account_nfts || [];

               // if (nfts.length <= 0) {
               //      data.sections.push({
               //           title: 'NFTs',
               //           openByDefault: true,
               //           content: [{ key: 'Status', value: `No NFTs found for <code>${wallet.classicAddress}</code>` }],
               //      });
               // } else {
               //      // Define flags (you can move this to a constant outside the function if reused elsewhere)
               //      const TF_BURNABLE = 0x00000001;
               //      const idsSet = (this.nftIdField || '')
               //           .split(',')
               //           .map(s => s.trim())
               //           .filter(Boolean);

               //      // Add all NFTs section
               //      data.sections.push({
               //           title: `NFTs (${nfts.length})`,
               //           openByDefault: true,
               //           subItems: nfts.map((nft: any, index: number) => {
               //                const { NFTokenID, NFTokenTaxon, Issuer, URI, Flags, TransferFee } = nft;
               //                const isBurnable = (nft.Flags & TF_BURNABLE) !== 0;
               //                const checkedAttr = idsSet.includes(nft.NFTokenID) ? 'checked' : '';
               //                const burnLabel = isBurnable ? 'Burn' : 'Burn';
               //                const disabledAttr = isBurnable ? '' : '';

               //                return {
               //                     // key: `NFT ${index + 1} (ID: ${NFTokenID.slice(8, -1)}...) Flags: ${String(this.decodeNftFlags(Flags))}`,
               //                     key: `NFT ${index + 1} (ID: ...${NFTokenID.slice(-16)})`,
               //                     openByDefault: false,
               //                     content: [
               //                          {
               //                               key: 'NFToken ID',
               //                               value: `<code>${nft.NFTokenID}</code><label class="burn-checkbox"><input type="checkbox" class="burn-check" data-id="${nft.NFTokenID}" ${disabledAttr} ${checkedAttr}/>${burnLabel}</label>`,
               //                          },
               //                          { key: 'Taxon', value: String(NFTokenTaxon) },
               //                          ...(Issuer ? [{ key: 'Issuer', value: `<code>${Issuer}</code>` }] : []),
               //                          ...(URI
               //                               ? [
               //                                      { key: 'URI', value: `<code>${this.utilsService.decodeHex(URI)}</code>` },
               //                                      { key: 'Image', value: `<img id="nftImage" src="${this.utilsService.decodeHex(URI)}" width="150" height="150">` },
               //                                 ]
               //                               : []),
               //                          { key: 'Flags', value: String(this.decodeNftFlags(Flags)) },
               //                          ...(TransferFee ? [{ key: 'Transfer Fee', value: `${TransferFee / 1000}%` }] : []),
               //                     ],
               //                };
               //           }),
               //      });
               // }

               // this.ui.setSuccess(this.result);

               // // --- Attach Burn Checkbox Logic ---
               // setTimeout(() => {
               //      const burnChecks = document.querySelectorAll<HTMLInputElement>('input.burn-check');

               //      burnChecks.forEach(checkbox => {
               //           checkbox.addEventListener('change', (e: Event) => {
               //                const target = e.target as HTMLInputElement;
               //                const nftId = target.getAttribute('data-id');
               //                const isChecked = target.checked;

               //                // Sync all checkboxes for same NFT ID
               //                document.querySelectorAll<HTMLInputElement>(`input.burn-check[data-id="${nftId}"]`).forEach(cb => {
               //                     if (cb !== target) {
               //                          cb.checked = isChecked;
               //                     }
               //                });

               //                // Update textarea or linked field
               //                if (nftId) this.updateNftTextField(nftId, isChecked);
               //           });
               //      });

               //      // Stop checkbox clicks from interfering with <code> copy
               //      document.querySelectorAll<HTMLInputElement>('input.burn-check').forEach(cb => {
               //           cb.addEventListener('click', (e: Event) => e.stopPropagation());
               //      });
               // });

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getNFT:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getNFT in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async mintNFT() {
          console.log('Entering mintNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
               // issuerAddressField: this.issuerAddressField,
          };

          if (this.flags.asfNoFreeze && this.flags.asfGlobalFreeze) {
               return this.ui.setError('ERROR: Cannot enable both NoFreeze and GlobalFreeze');
          }

          const nftFlags = this.getFlagsValue(this.nftFlags);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'mintNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const nFTokenMintTx: NFTokenMint = {
                    TransactionType: 'NFTokenMint',
                    Account: wallet.classicAddress,
                    Flags: nftFlags,
                    NFTokenTaxon: parseInt(this.taxonField, 0),
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, nFTokenMintTx, wallet, accountInfo, 'mint');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenMintTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating NFT Mint (no changes will be made)...' : 'Submitting NFT Mint to Ledger...', 200);

               this.ui.setPaymentTx(nFTokenMintTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenMintTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenMintTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Minted NFT successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    this.getExistingNfts(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated NFT Mint successfully!';
               }
          } catch (error: any) {
               console.error('Error in mintNFT:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving mintNFT in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async mintBatchNFT() {
          console.log('Entering mintBatchNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftCountField: this.nftCountField,
               batchMode: this.batchMode ? this.batchMode : '',
               uri: this.initialURIField,
          };

          if (!this.isBatchModeEnabled) {
               return this.ui.setError('Batch Mode slider is not enabled.');
          }

          let nftFlags = 0;
          // if (this.isNftFlagModeEnabled) {
          nftFlags = this.getFlagsValue(this.nftFlags);
          // }
          const batchFlags = this.setBatchFlags();

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'batchNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               let { regularKeyWalletSignTx }: { useRegularKeyWalletSignTx: boolean; regularKeyWalletSignTx: any } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

               const transactions: NFTokenMint[] = [];
               for (let i = 0; i < parseInt(this.nftCountField); i++) {
                    transactions.push({
                         TransactionType: 'NFTokenMint',
                         Account: wallet.classicAddress,
                         URI: xrpl.convertStringToHex(this.initialURIField),
                         Flags: nftFlags | AppConstants.TF_INNER_BATCH_TXN.BATCH_TXN, // Combine existing flags with tfInnerBatchTxn
                         NFTokenTaxon: parseInt(this.taxonField, 10),
                         Fee: '0', // Fee must be "0" for inner transactions
                    });
               }

               let response: any;

               if (transactions.length === 1) {
                    // Normal NFTokenMint (no batch needed)
                    const singleTx: NFTokenMint = {
                         ...transactions[0],
                         Flags: nftFlags, // remove tfInnerBatchTxn when it's standalone
                         Fee: fee,
                    };

                    const prepared = await client.autofill(singleTx);
                    response = await client.submitAndWait(prepared, { wallet });
               } else {
                    // Batch submit if > 1
                    if (this.useMultiSign) {
                         response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, {
                              isMultiSign: true,
                              signerAddresses: this.multiSignAddress,
                              signerSeeds: this.multiSignSeeds,
                              fee: '12', // optional override
                         });
                    } else {
                         response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, { useRegularKeyWalletSignTx: regularKeyWalletSignTx });
                    }
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Minted Batch NFT successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated NFT Batch Mint successfully!';
               }
          } catch (error: any) {
               console.error('Error in mintBatchNFT:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving mintBatchNFT in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async burnNFT() {
          console.log('Entering burnNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIdField: this.nftIdField,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               if (this.destinationField === '') {
                    return this.ui.setError(`Destination cannot be empty.`);
               }
               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'burnNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const validNFTs = this.utilsService.parseAndValidateNFTokenIDs(this.nftIdField);
               if (!validNFTs) {
                    return this.ui.setError(`ERROR: Invalid NFT Id`);
               }

               if (validNFTs.length > 1) {
                    return this.ui.setError(`ERROR: Use Batch Mode to burn multiple NFT's at once.`);
               }

               const nFTokenBurnTx: NFTokenBurn = {
                    TransactionType: 'NFTokenBurn',
                    Account: wallet.classicAddress,
                    NFTokenID: this.nftIdField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, nFTokenBurnTx, wallet, accountInfo, 'burn');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenBurnTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating NFT Burn (no changes will be made)...' : 'Submitting to Ledger...', 200);

               this.ui.setPaymentTx(nFTokenBurnTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenBurnTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenBurnTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Burned NFT executed successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    this.getExistingNfts(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Burned NFT successfully!';
               }
          } catch (error: any) {
               console.error('Error in burnNFT:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving burnNFT in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async burnBatchNFT() {
          console.log('Entering burnBatchNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIdField: this.nftIdField,
               batchMode: this.batchMode ? this.batchMode : '',
               uri: this.uriField,
          };

          const validNFTs = this.utilsService.parseAndValidateNFTokenIDs(this.nftIdField);
          if (!validNFTs) {
               return this.ui.setError(`ERROR: Invalid NFT Id`);
          }

          const nftIds = this.utilsService.getNftIds(this.nftIdField);
          const batchFlags = this.setBatchFlags();

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'batchBurnNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               let { regularKeyWalletSignTx }: { useRegularKeyWalletSignTx: boolean; regularKeyWalletSignTx: any } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

               const transactions: any[] = nftIds.map((nftId: any) => ({
                    TransactionType: 'NFTokenBurn',
                    Account: wallet.classicAddress,
                    NFTokenID: nftId,
                    Flags: AppConstants.TF_INNER_BATCH_TXN.BATCH_TXN, // 1073741824
                    Fee: '0',
               }));

               let response: any;

               if (transactions.length === 1) {
                    // Normal NFTokenBurn (no batch needed)
                    const singleTx: NFTokenBurn = {
                         ...transactions[0],
                         Fee: undefined, // let autofill set correct fee
                         Flags: fee,
                    };

                    const prepared = await client.autofill(singleTx);
                    console.log(`Single-sign batch:`, prepared);
                    response = await client.submitAndWait(prepared, { wallet });
                    console.log(`response:`, response);
               } else {
                    // Batch submit if > 1
                    if (this.useMultiSign) {
                         response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, {
                              isMultiSign: true,
                              signerAddresses: this.multiSignAddress,
                              signerSeeds: this.multiSignSeeds,
                              fee: '12', // optional override
                         });
                    } else {
                         response = await this.batchService.submitBatchTransaction(client, wallet, transactions, batchFlags, { useRegularKeyWalletSignTx: regularKeyWalletSignTx });
                    }
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Burned NFT executed successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Burned Batch NFT successfully!';
               }
          } catch (error: any) {
               console.error('Error in burnBatchNFT:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving burnBatchNFT in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async updateNFTMetadata() {
          console.log('Entering updateNFTMetadata');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIdField: this.nftIdField,
               uri: this.uriField,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo, nftInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } }))]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects('nftInfo', nftInfo);

               inputs.accountInfo = accountInfo;
               inputs.nft_info = nftInfo;

               const errors = this.validateInputs(inputs, 'updateMetadata');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const nFTokenModifyTx: NFTokenModify = {
                    TransactionType: 'NFTokenModify',
                    Account: wallet.classicAddress,
                    NFTokenID: this.nftIdField,
                    URI: xrpl.convertStringToHex(this.uriField),
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, nFTokenModifyTx, wallet, accountInfo, 'updateMetaData');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenModifyTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating NFT Meta Update (no changes will be made)...' : 'Submitting NFT Meta Update to Ledger...', 200);

               this.ui.paymentTx.push(nFTokenModifyTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenModifyTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenModifyTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Updated NFT Meta Data successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Update NFT Meta Data successfully!';
               }
          } catch (error: any) {
               console.error('Error in updateNFTMetadata:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving updateNFTMetadata in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     private getExistingNfts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nftPages = (checkObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

          // Flatten all NFTokens from all pages
          const allNfts = nftPages.flatMap((page: any) => {
               return page.NFTokens.map((entry: any) => {
                    const nft = entry.NFToken;

                    return {
                         LedgerEntryType: page.LedgerEntryType,
                         PageIndex: page.index,
                         NFTokenID: nft.NFTokenID,
                         Flags: nft.Flags ?? 0,
                         Issuer: nft.Issuer,
                         Taxon: nft.NFTaxon,
                         TransferFee: nft.TransferFee,
                         Sequence: nft.Sequence,
                         URI_hex: nft.URI,
                         URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                    };
               });
          });

          this.existingNfts = allNfts;

          this.utilsService.logObjects('existingNfts', this.existingNfts);

          return this.existingNfts;
     }

     // private getExistingNfts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
     //      this.existingNfts = (checkObjects.result.account_objects ?? [])
     //           .filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage')
     //           .map((obj: any) => {
     //                return {
     //                     LedgerEntryType: obj.LedgerEntryType,
     //                     id: obj.index,
     //                     mpt_issuance_id: obj.mpt_issuance_id,
     //                     TransferFee: obj.TransferFee,
     //                     OutstandingAmount: obj.OutstandingAmount,
     //                     MaximumAmount: obj.MaximumAmount,
     //                     MPTokenMetadata: obj.MPTokenMetadata,
     //                     Issuer: obj.Issuer,
     //                     Flags: obj.Flags,
     //                     AssetScale: obj.AssetScale,
     //                };
     //           });
     //      this.utilsService.logObjects('existingNfts', this.existingNfts);
     // }

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

          this.totalFlagsValue = sum;
          this.totalFlagsHex = '0x' + sum.toString(16).toUpperCase().padStart(8, '0');
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

     // decodeNftFlags(value: number): string {
     //      const active: string[] = [];
     //      for (const [name, bit] of Object.entries(AppConstants.NFT_FLAGS)) {
     //           if ((value & bit) !== 0) {
     //                active.push(name);
     //           }
     //      }
     //      return active.join(', ');
     // }

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

     // decodeMPTFlags(flags: number) {
     //      const MPT_FLAGS = {
     //           tfMPTCanLock: 0x00000002,
     //           tfMPTCanEscrow: 0x00000004,
     //           tfMPTCanTrade: 0x00000008,
     //           tfMPTCanClawback: 0x00000010,
     //           tfMPTRequireAuth: 0x00000020,
     //           tfMPTImmutable: 0x00000040,
     //           tfMPTDisallowIncoming: 0x00000080,
     //      };

     //      const activeFlags = [];
     //      for (const [name, value] of Object.entries(MPT_FLAGS)) {
     //           if ((flags & value) !== 0) {
     //                activeFlags.push(name);
     //           }
     //      }
     //      return activeFlags;
     // }

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

     // setNftFlags() {
     //      let flags = 0;
     //      if (this.burnableNft) {
     //           flags |= xrpl.NFTokenMintFlags.tfBurnable;
     //      }

     //      if (this.onlyXrpNft) {
     //           flags |= xrpl.NFTokenMintFlags.tfOnlyXRP;
     //      }

     //      if (this.transferableNft) {
     //           flags |= xrpl.NFTokenMintFlags.tfTransferable;
     //      }

     //      if (this.mutableNft) {
     //           flags |= xrpl.NFTokenMintFlags.tfMutable;
     //      }

     //      console.log('NFt flags ' + flags);
     //      return flags;
     // }

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
          return Object.keys(this.knownTrustLinesIssuers)
               .filter(c => c !== 'XRP')
               .sort((a, b) => a.localeCompare(b));
     }

     private async setTxOptionalFields(client: xrpl.Client, nftTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string): Promise<string | void> {
          const address = wallet.classicAddress;
          const sequence = accountInfo.result.account_data.Sequence;
          const hasMultipleTickets = this.multiSelectMode && this.selectedTickets.length > 0;

          // --- Helper: set ticket sequence ---
          const setTicket = async (ticket?: string | number): Promise<string | void> => {
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, address, Number(ticket));
                    if (!exists) return `ERROR: Ticket Sequence ${ticket} not found for account ${address}`;
                    this.utilsService.setTicketSequence(nftTx, String(ticket), true);
               } else if (hasMultipleTickets) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(nftTx, String(sequence), false);
               } else {
                    this.utilsService.setTicketSequence(nftTx, String(sequence), false);
               }
          };

          // --- Helper: set expiration ---
          const setExpiration = (): boolean => {
               if (this.expirationField) {
                    const expireTime = this.utilsService.addTime(this.expirationField, 'hours');
                    this.utilsService.setExpiration(nftTx, expireTime);
                    return true;
               }
               return false;
          };

          // --- Helper: set memo ---
          const setMemo = (): void => {
               if (this.memoField) this.utilsService.setMemoField(nftTx, this.memoField);
          };

          // --- Common handling for multiple tx types ---
          if (['mint', 'burn', 'buy', 'updateMetaData', 'sell', 'buyOffer', 'sellOffer', 'cancelBuyOffer', 'cancelSellOffer'].includes(txType)) {
               const ticket = this.selectedSingleTicket || this.ticketSequence || undefined;
               const ticketError = await setTicket(ticket);
               if (ticketError) return this.ui.setError(ticketError);

               setMemo();
          }

          // --- Type-specific logic ---
          if (txType === 'mint') {
               if (this.initialURIField) this.utilsService.setURI(nftTx, this.initialURIField);

               if (this.transferFeeField) {
                    if (!this.isNftFlagModeEnabled || !this.transferableNft) {
                         return this.ui.setError('ERROR: Transferable NFT flag must be enabled with transfer fee.');
                    }
                    this.utilsService.setTransferFee(nftTx, this.transferFeeField);
               }

               if (this.isAuthorizedNFTokenMinter && this.nfTokenMinterAddress) {
                    if (!xrpl.isValidAddress(this.nfTokenMinterAddress)) {
                         return this.ui.setError('ERROR: Invalid Account address');
                    }
                    this.utilsService.setIssuerAddress(nftTx, this.nfTokenMinterAddress);
               }

               let needsAmount = setExpiration();

               // if (!this.nfTokenMinterAddress && this.isDestinationEnabled && this.destinationFields) {
               if (this.isDestinationEnabled && this.destinationFields) {
                    this.utilsService.setDestination(nftTx, this.destinationFields);
                    needsAmount = true;
               }

               if (needsAmount && this.amountField) {
                    this.utilsService.setAmount(nftTx, this.amountField);
               }
          }

          if (['sell', 'buyOffer', 'sellOffer'].includes(txType)) {
               setExpiration();
          }

          return nftTx;
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
          }
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets, this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet = { ...newCurrent };
          });
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          this.selectedTicket = this.ticketArray[0] || this.selectedTicket;

          // Signer accounts
          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          this.signerQuorum = signerQuorum;
          const hasSignerAccounts = signerAccounts?.length > 0;
          this.checkForMultiSigners(hasSignerAccounts, wallet);

          // Boolean flags
          this.multiSigningEnabled = hasSignerAccounts;
          this.useMultiSign = false;
          this.masterKeyDisabled = Boolean(accountInfo?.result?.account_flags?.disableMasterKey);

          this.clearFields(false);
     }

     private checkForMultiSigners(hasSignerAccounts: boolean, wallet: xrpl.Wallet) {
          if (hasSignerAccounts) {
               const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.multiSignAddress = signerEntries.map((e: { Account: any }) => e.Account).join(',\n');
               this.multiSignSeeds = signerEntries.map((e: { seed: any }) => e.seed).join(',\n');
          } else {
               this.signerQuorum = 0;
               this.multiSignAddress = 'No Multi-Sign address configured for account';
               this.multiSignSeeds = '';
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
          this.regularKeyAddress = rkProps.regularKeyAddress;
          this.regularKeySeed = rkProps.regularKeySeed;

          // Set master key property
          this.masterKeyDisabled = isMasterKeyDisabled;

          // Set regular key signing enabled flag
          this.regularKeySigningEnabled = !!regularKey;
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.destinationDropdownService.setItems(this.destinations);
     }

     private validateInputs(inputs: ValidationInputs, action: string): string[] {
          const errors: string[] = [];

          // --- Shared skip helper ---
          const shouldSkipNumericValidation = (value: string | undefined): boolean => {
               return value === undefined || value === null || value.trim() === '';
          };

          // --- Common validators ---
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null || !this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty.`;
               }
               return null;
          };

          const isValidXrpAddress = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidAddress(value)) {
                    return `${fieldName} is invalid.`;
               }
               return null;
          };

          const isValidSecret = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidSecret(value)) {
                    return `${fieldName} is invalid.`;
               }
               return null;
          };

          const isNotSelfPayment = (sender: string | undefined, receiver: string | undefined): string | null => {
               if (sender && receiver && sender === receiver) {
                    return `Sender and receiver cannot be the same.`;
               }
               return null;
          };

          const isValidNumber = (value: string | undefined, fieldName: string, minValue?: number, allowEmpty: boolean = false): string | null => {
               // Skip number validation if value is empty — required() will handle it
               if (shouldSkipNumericValidation(value) || (allowEmpty && value === '')) return null;

               // Type-safe parse
               const num = parseFloat(value as string);

               if (isNaN(num) || !isFinite(num)) {
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num <= minValue) {
                    return `${fieldName} must be greater than ${minValue}`;
               }
               return null;
          };

          const isBatchCountValid = (value: string | undefined, fieldName: string): string | null => {
               if (value === undefined) return null; // Not required, so skip
               const num = parseInt(value);
               if (num > 8) {
                    return `${fieldName} must be less than 8`;
               } else if (num <= 0) {
                    return `${fieldName} cannot be zero`;
               }
               return null;
          };

          const isValidSeed = (value: string | undefined): string | null => {
               if (value) {
                    const { type, value: detectedValue } = this.utilsService.detectXrpInputType(value);
                    if (detectedValue === 'unknown') {
                         return 'Account seed is invalid';
                    }
               }
               return null;
          };

          const nftExistOnAccountAndMutable = (nft_info: any | undefined, nftId: string | undefined): string | null => {
               if (nft_info && nft_info.result?.account_nfts?.length > 0) {
                    const nfts = nft_info.result.account_nfts;
                    if (nftId) {
                         const targetNFT = nfts.find((nft: any) => nft.NFTokenID === nftId);
                         if (targetNFT) {
                              if (this.decodeNftFlags(targetNFT.Flags).includes('Mutable')) {
                                   return null;
                              } else {
                                   return 'NFT is not mutable';
                              }
                         } else {
                              return 'NFT Id not found';
                         }
                    } else {
                         return 'No NFT for the NFT ID';
                    }
               } else {
                    return 'No NFT for the NFT ID';
               }
          };

          const validateMultiSign = (addressesStr: string | undefined, seedsStr: string | undefined): string | null => {
               if (!addressesStr || !seedsStr) return null;
               const addresses = this.utilsService.getMultiSignAddress(addressesStr);
               const seeds = this.utilsService.getMultiSignSeeds(seedsStr);
               if (addresses.length === 0) {
                    return 'At least one signer address is required for multi-signing';
               }
               if (addresses.length !== seeds.length) {
                    return 'Number of signer addresses must match number of signer seeds';
               }
               const invalidAddr = addresses.find((addr: string) => !xrpl.isValidAddress(addr));
               if (invalidAddr) {
                    return `Invalid signer address: ${invalidAddr}`;
               }
               const invalidSeed = seeds.find((seed: string) => !xrpl.isValidSecret(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid';
               }
               return null;
          };

          // Action-specific config: required fields and custom rules
          const actionConfig: Record<string, { required: (keyof ValidationInputs)[]; customValidators?: (() => string | null)[] }> = {
               getNFTs: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed)],
               },
               mintNFT: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isValidXrpAddress(inputs.issuerAddressField, 'Issuer address')],
               },
               batchNFT: {
                    required: ['seed', 'nftCountField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isValidNumber(inputs.nftCountField, 'NFT count', 0), () => isRequired(inputs.uri, 'URI'), () => isBatchCountValid(inputs.nftCountField, 'NFT Count'), () => isRequired(inputs.batchMode, 'Batch Mode')],
               },
               batchBurnNFT: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isBatchCountValid(inputs.nftCountField, 'NFT Count')],
               },
               burnNFT: {
                    required: ['seed', 'nftIdField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID')],
               },
               getNFTOffers: {
                    // required: [ 'seed', 'nftIdField'],
                    required: ['seed'],
                    // customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID')],
                    customValidators: [() => isValidSeed(inputs.seed)],
               },
               buyNFT: {
                    required: ['seed', 'nftIdField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID')],
               },
               sellNFT: {
                    required: ['seed', 'nftIdField', 'amount'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID'), () => isValidNumber(inputs.amount, 'Amount', 0)],
               },
               cancelBuyNFT: {
                    required: ['seed', 'nftIndexField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIndexField, 'NFT Offer Index')],
               },
               cancelSellNFT: {
                    required: ['seed', 'nftIndexField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIndexField, 'NFT Offer Index')],
               },
               updateMetadata: {
                    required: ['seed', 'nftIdField', 'uri'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID'), () => isRequired(inputs.uri, 'URI'), () => nftExistOnAccountAndMutable(inputs.nft_info, inputs.nftIdField)],
               },
               default: { required: [], customValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // Check required fields
          config.required.forEach((field: keyof ValidationInputs) => {
               const err = isRequired(inputs[field], field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          });

          // Run custom validators
          config.customValidators?.forEach((validator: () => string | null) => {
               const err = validator();
               if (err) errors.push(err);
          });

          // Always validate optional fields if provided (e.g., multi-sign, regular key)
          const multiErr = validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds);
          if (multiErr) errors.push(multiErr);

          const regAddrErr = isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address');
          if (regAddrErr && inputs.regularKeyAddress !== 'No RegularKey configured for account') errors.push(regAddrErr);

          const regSeedErr = isValidSecret(inputs.regularKeySeed, 'Regular Key Seed');
          if (regSeedErr) errors.push(regSeedErr);

          if (errors.length == 0 && inputs.useMultiSign && (inputs.multiSignAddresses === 'No Multi-Sign address configured for account' || inputs.multiSignSeeds === '')) {
               errors.push('At least one signer address is required for multi-signing');
          }

          return errors;
     }

     setBatchMode(mode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent') {
          this.batchMode = mode;
          this.toggleFlags(); // optional: update your XRPL batch flags
     }

     onBurnToggle(checked: boolean, nftId: string) {
          // normalize current ids
          const ids = (this.nftIdField || '')
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

          this.nftIdField = ids.join(', ');
     }

     private burnCheckboxHandler(event: Event) {
          const target = event.target as HTMLInputElement;
          if (!target) return;
          if (!target.classList.contains('burn-check')) return;

          const nftId = target.getAttribute('data-id');
          if (!nftId) return;

          // run inside Angular zone so template/ngModel updates
          this.ngZone.run(() => {
               this.onBurnToggle(target.checked, nftId);
          });
     }

     updateNftTextField(nftId: string, add: boolean) {
          let ids = (this.nftIdField || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (add && !ids.includes(nftId)) {
               ids.push(nftId);
          } else if (!add) {
               ids = ids.filter(id => id !== nftId);
          }

          this.nftIdField = ids.join(', ');
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     private addNewDestinationFromUser() {
          const addr = this.destinationField.includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

          if (addr && xrpl.isValidAddress(addr) && !this.destinations.some(d => d.address === addr)) {
               this.customDestinations.push({ name: `Custom ${this.customDestinations.length + 1}`, address: addr });
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
               this.updateDestinations();
          }
     }

     copyNFTokenID(NFTokenID: string) {
          navigator.clipboard.writeText(NFTokenID).then(() => {
               this.ui.showToastMessage('MPT Issuance ID copied!');
          });
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.ui.showToastMessage('Check ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('IOU Token Issuer copied!');
          });
     }

     private updateInfoMessage() {
          const walletName = this.currentWallet.name || 'selected';
          const count = this.existingNfts.length;

          let message: string;

          if (count === 0) {
               message = `<code>${walletName}</code> wallet has no NFTs.`;
          } else {
               const nftWord = count === 1 ? 'NFT' : 'NFTs';

               // Determine the appropriate action text based on the current tab
               const actionText = this.getActionText();

               message = `<code>${walletName}</code> wallet has <strong>${count}</strong> ${nftWord}.`;

               // Add tab-specific action description if applicable
               if (actionText) {
                    message += ` ${actionText}.`;
               }

               // Add link to view NFTs when NFTs are present
               const link = `${this.url}account/${this.currentWallet.address}/nfts`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View NFTs on XRPL Win</a>`;
          }

          this.ui.setInfoMessage(message);
     }

     private getActionText(): string {
          switch (this.activeTab) {
               case 'create':
                    return 'that can be created';
               case 'burn':
                    return 'that can be burned';
               case 'updateNFTMetadata':
                    return 'whose metadata can be updated';
               default:
                    return '';
          }
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.initialURIField = '';
               this.uriField = '';
               this.isBatchModeEnabled = false;
               this.isNftFlagModeEnabled = false;
               this.isNftFlagModeEnabled = false;
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          this.expirationTimeUnit = 'seconds';
          this.amountField = '';
          this.minterAddressField = '';
          this.issuerAddressField = '';
          this.expirationField = '';
          this.nftIdField = '';
          this.nftIndexField = '';
          this.nftCountField = '';
          this.memoField = '';
          this.isMemoEnabled = false;
          this.isTicket = false;
          this.ticketSequence = '';
          this.cdr.detectChanges();
     }

     get safeWarningMessage() {
          return this.ui.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     filterDestinations() {
          const query = this.filterQuery.trim().toLowerCase();

          if (query === '') {
               this.filteredDestinations = [...this.destinations];
          } else {
               this.filteredDestinations = this.destinations.filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query)));
          }

          this.highlightedIndex = this.filteredDestinations.length > 0 ? 0 : -1;
     }

     onArrowDown() {
          if (!this.showDropdown || this.filteredDestinations.length === 0) return;
          this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredDestinations.length;
     }

     selectHighlighted() {
          if (this.highlightedIndex >= 0 && this.filteredDestinations[this.highlightedIndex]) {
               const addr = this.filteredDestinations[this.highlightedIndex].address;
               if (addr !== this.currentWallet.address) {
                    this.destinationField = addr;
                    this.closeDropdown(); // Also close on Enter
               }
          }
     }

     // Dropdown controls
     openDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;
          const dest = this.destinations.find(d => d.address === address);
          this.destinationField = dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`;
          this.closeDropdown();
     }

     private openDropdownInternal() {
          if (this.overlayRef?.hasAttached()) return;

          const strategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }]);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy: strategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });

          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal() {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult() {
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          afterRenderEffect(
               () => {
                    const paymentStr = JSON.stringify(this.ui.paymentTx, null, 2);
                    const resultStr = JSON.stringify(this.ui.txResult, null, 2);

                    if (this.paymentJson?.nativeElement && paymentStr !== this.lastPaymentTx) {
                         this.paymentJson.nativeElement.textContent = paymentStr;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                         this.lastPaymentTx = paymentStr;
                    }

                    if (this.txResultJson?.nativeElement && resultStr !== this.lastTxResult) {
                         this.txResultJson.nativeElement.textContent = resultStr;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                         this.lastTxResult = resultStr;
                    }

                    this.cdr.detectChanges();
               },
               { injector: this.injector }
          );
     }
}
