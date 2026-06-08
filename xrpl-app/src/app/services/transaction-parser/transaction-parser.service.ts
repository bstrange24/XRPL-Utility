import { inject, Injectable } from '@angular/core';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';

export interface KeyDetail {
     label: string;
     value?: string | number;
     icon?: string;
     type?: 'text' | 'credential-list' | 'memo-list' | 'signer-list';
     credentials?: Array<{
          type: string;
          issuer: string;
     }>;
     memos?: Array<{
          data: string;
          type?: string;
          format?: string;
     }>;
     signers?: Array<{
          account: string;
          signingPubKey: string;
          signature?: string;
     }>;
}

export interface SigningInfo {
     method: 'master' | 'regular' | 'multi-sig';
     regularKeyAddress?: string;
     signerCount?: number;
}

export interface ParsedTransactionResult {
     status: 'success' | 'failed';
     transactionType: string;
     summary: {
          title: string;
          description: string;
          amount?: string;
          from?: string;
          to?: string;
          fee?: string;
          sequence?: number;
     };
     keyDetails: KeyDetail[];
     affectedAccounts: Array<{
          address: string;
          changes: string;
     }>;
     warnings?: string[];
     errors?: string[];
     successMessage?: string[];
     hash: string;
     ledgerIndex: number;
     timestamp: Date;
     explorerUrl: string;
     isValidated: boolean;
     rawData?: any; // Optional for advanced users
}

@Injectable({ providedIn: 'root' })
export class TransactionParserService {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     parse(result: any, explorerUrl: string): ParsedTransactionResult {
          const txJson = result.tx_json || result;
          const meta = result.meta;
          const isValidated = result.validated;
          const isSuccess = result.meta?.TransactionResult === 'tesSUCCESS';

          const transactionType = txJson.TransactionType;
          const formatter = this.getFormatter(transactionType);

          const summary = formatter.getSummary(txJson, meta);
          let keyDetails = formatter.getKeyDetails(txJson, meta);
          const affectedAccounts = this.parseAffectedAccounts(meta);

          // Add memos and signers
          keyDetails = this.addMemosToKeyDetails(keyDetails, txJson);
          keyDetails = this.addSignersToKeyDetails(keyDetails, txJson);
          keyDetails = this.addSigningInfoToKeyDetails(keyDetails, txJson, meta);

          console.debug('Parsed transaction result:', keyDetails, affectedAccounts);

          return {
               status: isSuccess ? 'success' : 'failed',
               transactionType,
               summary,
               keyDetails,
               affectedAccounts,
               hash: result.hash || txJson.hash,
               ledgerIndex: result.ledger_index || txJson.ledger_index,
               timestamp: new Date(result.close_time_iso || Date.now()),
               explorerUrl: `${explorerUrl}tx/${result.hash || txJson.hash}`,
               warnings: this.checkWarnings(result),
               errors: this.checkErrors(result),
               successMessage: this.checkSuccessMessage(result),
               rawData: result, // Keep raw data for debugging
               isValidated: isValidated,
          };
     }

     private parseAffectedAccounts(meta: any): Array<{ address: string; changes: string }> {
          if (!meta?.AffectedNodes) return [];

          const accounts = new Map<string, string[]>();

          meta.AffectedNodes.forEach((node: any) => {
               let address: string | null = null;
               let change = '';

               if (node.ModifiedNode) {
                    address = node.ModifiedNode.FinalFields?.Account || node.ModifiedNode.FinalFields?.Owner;
                    const balanceChange = this.calculateBalanceChange(node.ModifiedNode.PreviousFields?.Balance, node.ModifiedNode.FinalFields?.Balance);
                    if (balanceChange) change = balanceChange;
               }

               if (node.DeletedNode) {
                    address = node.DeletedNode.FinalFields?.Owner || node.DeletedNode.FinalFields?.Account;
                    change = 'Entry removed from ledger';
               }

               if (address) {
                    if (!accounts.has(address)) accounts.set(address, []);
                    if (change) accounts.get(address)!.push(change);
               }
          });

          return Array.from(accounts.entries()).map(([address, changes]) => ({
               address,
               changes: changes.join(', '),
          }));
     }

     private calculateBalanceChange(previous?: string, current?: string): string | null {
          if (!previous || !current) return null;
          const prevNum = Number.parseInt(previous);
          const currNum = Number.parseInt(current);
          const diff = currNum - prevNum;
          if (diff === 0) return null;
          return `${diff > 0 ? '+' : ''}${(diff / 1000000).toFixed(6)} XRP`;
     }

     private checkWarnings(result: any): string[] {
          const warnings: string[] = [];

          // Check for large fee
          const fee = Number.parseInt(result.tx_json?.Fee || '0');
          if (fee > 5000) {
               warnings.push(`High transaction fee: ${(fee / 1000000).toFixed(6)} XRP`);
          }

          // Check for expiration
          if (result.tx_json?.LastLedgerSequence) {
               const currentLedger = result.ledger_index;
               const lastLedger = result.tx_json.LastLedgerSequence;
               if (lastLedger - currentLedger < 10) {
                    warnings.push('Transaction is close to expiring');
               }
          }

          return warnings;
     }

     private checkErrors(result: any): string[] {
          const errors: string[] = [];

          const txResult = result;
          if (txResult.engine_result != undefined && txResult.engine_result_message !== undefined && txResult.engine_result !== 'tesSUCCESS') {
               errors.push(`${txResult.engine_result} (${txResult.engine_result_message})`);
          }

          return errors;
     }

     private checkSuccessMessage(result: any): string[] {
          const errors: string[] = [];

          const txResult = result;
          if (txResult.engine_result != undefined && txResult.engine_result_message !== undefined && txResult.engine_result === 'tesSUCCESS') {
               errors.push(`${txResult.engine_result} (${txResult.engine_result_message})`);
          }

          return errors;
     }

     private getFormatter(transactionType: string): TransactionFormatter {
          const formatters: Record<string, TransactionFormatter> = {
               Payment: new PaymentFormatter(),
               OfferCreate: new OfferCreateFormatter(),
               OfferCancel: new OfferCancelFormatter(),
               AccountSet: new AccountSetFormatter(),
               TrustSet: new TrustSetFormatter(),
               EscrowCreate: new EscrowCreateFormatter(),
               EscrowFinish: new EscrowFinishFormatter(),
               EscrowCancel: new EscrowCancelFormatter(),
               PaymentChannelCreate: new PaymentChannelCreateFormatter(),
               PaymentChannelClaim: new PaymentChannelClaimFormatter(),
               PaymentChannelFund: new PaymentChannelFundFormatter(),
               SignerListSet: new SignerListSetFormatter(),
               NFTokenMint: new NFTokenMintFormatter(),
               NFTokenBurn: new NFTokenBurnFormatter(),
               NFTokenCreateOffer: new NFTokenCreateOfferFormatter(),
               NFTokenAcceptOffer: new NFTokenAcceptOfferFormatter(),
               NFTokenCancelOffer: new NFTokenCancelOfferFormatter(),
               PermissionedDomainCreate: new PermissionedDomainCreateFormatter(),
               PermissionedDomainSet: new PermissionedDomainSetFormatter(),
               PermissionedDomainDelete: new PermissionedDomainDeleteFormatter(),
               DIDSet: new DidSetPreviewFormatter(),
               DIDDelete: new DidDeletePreviewFormatter(),
          };

          return formatters[transactionType] || new GenericFormatter(transactionType);
     }

     private addMemosToKeyDetails(keyDetails: KeyDetail[], tx: any): KeyDetail[] {
          if (tx.Memos && tx.Memos.length > 0 && !keyDetails.some(detail => detail.type === 'memo-list')) {
               return [
                    ...keyDetails,
                    {
                         label: 'Memos',
                         type: 'memo-list',
                         icon: '📝',
                         memos: tx.Memos.map((m: any) => ({
                              data: m.Memo?.MemoData ? Buffer.from(m.Memo.MemoData, 'hex').toString('utf8') : '',
                              type: m.Memo?.MemoType ? Buffer.from(m.Memo.MemoType, 'hex').toString('utf8') : undefined,
                              format: m.Memo?.MemoFormat ? Buffer.from(m.Memo.MemoFormat, 'hex').toString('utf8') : undefined,
                         })),
                    },
               ];
          }
          return keyDetails;
     }

     private addSignersToKeyDetails(keyDetails: KeyDetail[], tx: any): KeyDetail[] {
          if (tx.Signers && tx.Signers.length > 0 && !keyDetails.some(detail => detail.type === 'signer-list')) {
               return [
                    ...keyDetails,
                    {
                         label: 'Signers',
                         type: 'signer-list',
                         icon: '✍️',
                         signers: tx.Signers.map((s: any) => ({
                              account: s.Signer?.Account ? s.Signer.Account : 'Unknown',
                              signingPubKey: s.Signer?.SigningPubKey ? shortenAddress(s.Signer.SigningPubKey) : 'Unknown',
                              signature: s.Signer?.TxnSignature ? shortenAddress(s.Signer.TxnSignature) : undefined,
                         })),
                    },
               ];
          }
          return keyDetails;
     }

     private detectSigningMethod(tx: any, meta: any): SigningInfo {
          // Check for multi-signature first (Signers array)
          if (tx.Signers && tx.Signers.length > 0) {
               return {
                    method: 'multi-sig',
                    signerCount: tx.Signers.length,
               };
          }

          // Check if signed with Regular Key
          const signingPubKey = tx.SigningPubKey;
          if (signingPubKey && signingPubKey !== '') {
               // Get the account's Regular Key from metadata or account info
               const regularKey = this.getRegularKeyFromMeta(meta, tx.Account);

               if (regularKey && this.xrplTxOptionsStore.isRegularKeyAddress()) {
                    // Derive address from signing pub key or compare directly
                    const signerAddress = this.getAddressFromPublicKey(signingPubKey);
                    if (signerAddress === regularKey || this.isRegularKeySigning(tx, meta)) {
                         return {
                              method: 'regular',
                              regularKeyAddress: regularKey,
                         };
                    }
               }
          }

          // Default to master key signing
          return { method: 'master' };
     }

     private getRegularKeyFromMeta(meta: any, accountAddress: string): string | null {
          if (!meta?.AffectedNodes) return null;

          for (const node of meta.AffectedNodes) {
               if (node.ModifiedNode?.LedgerEntryType === 'AccountRoot') {
                    const finalFields = node.ModifiedNode.FinalFields;
                    const previousFields = node.ModifiedNode.PreviousFields;

                    // Check if this is the sender's account
                    if (finalFields?.Account === accountAddress || previousFields?.Account === accountAddress) {
                         // Return the Regular Key if it exists
                         return finalFields?.RegularKey || previousFields?.RegularKey || null;
                    }
               }
          }

          return null;
     }

     private getAddressFromPublicKey(publicKeyHex: string): string | null {
          try {
               // This is a simplified version - you'll need to implement actual derivation
               // For XRP, you need to derive the address from the public key
               // You might need a library like 'ripple-address-codec' or 'xrpl'

               // Placeholder - in production, use proper derivation:
               // const address = deriveAddressFromPublicKey(publicKeyHex);
               // return address;

               return null; // Return null if derivation fails
          } catch (error) {
               console.error('Failed to derive address from public key:', error);
               return null;
          }
     }

     private isRegularKeySigning(tx: any, meta: any): boolean {
          // Check if the transaction includes a RegularKey field or if the signing pub key
          // matches a known Regular Key from the account's settings

          // Method 1: Check if the transaction itself indicates Regular Key signing
          // Some implementations include a flag or field indicating signing method

          // Method 2: Compare the signing public key with the master public key
          // If they're different, it's likely a Regular Key

          // Method 3: Check metadata for RegularKey field presence
          if (meta?.AffectedNodes) {
               for (const node of meta.AffectedNodes) {
                    if (node.ModifiedNode?.FinalFields?.RegularKey) {
                         return true;
                    }
               }
          }

          return false;
     }

     private addSigningInfoToKeyDetails(keyDetails: KeyDetail[], tx: any, meta: any): KeyDetail[] {
          const signingInfo = this.detectSigningMethod(tx, meta);

          let signingLabel = '';
          let signingValue = '';
          let signingIcon = '🔑';

          switch (signingInfo.method) {
               case 'master':
                    signingLabel = 'Signed With';
                    signingValue = 'Master Key';
                    signingIcon = '👑';
                    break;
               case 'regular':
                    signingLabel = 'Signed With';
                    signingValue = `Regular Key${signingInfo.regularKeyAddress ? ` (${shortenAddress(signingInfo.regularKeyAddress)})` : ''}`;
                    signingIcon = '🔑';
                    break;
               case 'multi-sig':
                    signingLabel = 'Signatures';
                    signingValue = `${signingInfo.signerCount} of ${signingInfo.signerCount || '?'} required`;
                    signingIcon = '✍️';
                    // Don't add a duplicate entry if we already have a signer list
                    if (keyDetails.some(detail => detail.type === 'signer-list')) {
                         return keyDetails;
                    }
                    break;
          }

          // Only add if not already present
          if (!keyDetails.some(detail => detail.label === signingLabel)) {
               return [
                    ...keyDetails,
                    {
                         label: signingLabel,
                         value: signingValue,
                         icon: signingIcon,
                    },
               ];
          }

          return keyDetails;
     }
}

// Base interface for formatters
interface TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'];
     // getKeyDetails(tx: any, meta: any): Array<{ label: string; value: string | number; icon?: string }>;
     getKeyDetails(tx: any, meta: any): KeyDetail[];
}

// Payment formatter
class PaymentFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any) {
          const amount = this.formatAmount(tx.Amount ? tx.Amount : tx.DeliverMax);
          const isSuccess = meta?.TransactionResult === 'tesSUCCESS';
          let description = `Successfully Sent ${amount} from ${this.shortenAddress(tx.Account)} to ${this.shortenAddress(tx.Destination)}`;
          if (!isSuccess) {
               description = `Failed to Send ${amount} from ${this.shortenAddress(tx.Account)} to ${this.shortenAddress(tx.Destination)}`;
          }
          return {
               title: 'Payment Sent',
               description: description,
               amount: amount,
               from: tx.Account,
               to: tx.Destination,
               fee: this.formatAmount(tx.Fee),
          };
     }

     getKeyDetails(tx: any, meta: any) {
          return [
               { label: 'Amount', value: this.formatAmount(tx.Amount ? tx.Amount : tx.DeliverMax), icon: '💰' },
               { label: 'Sender', value: this.shortenAddress(tx.Account), icon: '📤' },
               { label: 'Receiver', value: this.shortenAddress(tx.Destination), icon: '📥' },
               { label: 'Fee', value: this.formatAmount(tx.Fee), icon: '⛽' },
               ...(tx.DestinationTag
                    ? [
                           {
                                label: 'Destination Tag',
                                value: tx.DestinationTag,
                                icon: '🏷️',
                           },
                      ]
                    : []),
               ...(tx.Sequence
                    ? [
                           {
                                label: 'Account Sequence',
                                value: tx.Sequence,
                                icon: '🔢',
                           },
                      ]
                    : []),
               ...(tx.TicketSequence
                    ? [
                           {
                                label: 'Ticket Sequence',
                                value: tx.TicketSequence,
                                icon: '🎟️',
                           },
                      ]
                    : []),
          ];
     }

     private formatAmount(amount: any): string {
          if (!amount) return '0 XRP';
          if (typeof amount === 'string') {
               return `${(Number.parseInt(amount) / 1000000).toFixed(6)} XRP`;
          }
          if (amount.currency && amount.issuer) {
               return `${amount.value} ${amount.currency}`;
          }
          return String(amount);
     }

     private shortenAddress(address: string): string {
          if (!address) return 'Unknown';
          return `${address.slice(0, 5)}...${address.slice(-5)}`;
     }
}

// 1. OfferCreate Formatter
export class OfferCreateFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const isBuy = tx.Flags === 0; // Simplified - actual flags determine buy/sell
          const takerGets = formatCurrencyAmount(tx.TakerGets);
          const takerPays = formatCurrencyAmount(tx.TakerPays);

          return {
               title: isBuy ? 'Buy Offer Created' : 'Sell Offer Created',
               description: `Created an offer to ${isBuy ? 'buy' : 'sell'} ${takerGets} for ${takerPays}`,
               amount: `${takerGets} → ${takerPays}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [
               { label: 'Type', value: tx.Flags === 0 ? 'Passive Offer' : 'Immediate or Cancel', icon: '🏷️' },
               { label: 'Taker Gets', value: formatCurrencyAmount(tx.TakerGets), icon: '💰' },
               { label: 'Taker Pays', value: formatCurrencyAmount(tx.TakerPays), icon: '💳' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'AccountSequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Expiration', value: tx.Expiration ? formatDate(tx.Expiration) : 'Never', icon: '⏰' },
               { label: 'Offer ID', value: shortenAddress(tx.OfferID || 'New'), icon: '🆔' },
          ];

          if (tx.Fee) {
               details.push({ label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });
          }

          return details;
     }
}

// 2. OfferCancel Formatter
export class OfferCancelFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'Offer Cancelled',
               description: `Cancelled offer with sequence number ${tx.OfferSequence}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          return [
               { label: 'Cancelled Offer Sequence', value: tx.OfferSequence, icon: '🔢' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'AccountSequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];
     }
}

// 3. AccountSet Formatter
export class AccountSetFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const changes = this.getAccountSetChanges(tx);
          return {
               title: 'Account Settings Updated',
               description: `Updated account settings: ${changes.join(', ')}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [];

          if (tx.Domain) {
               details.push({ label: 'Domain', value: atob(tx.Domain), icon: '🌐' });
          }
          if (tx.EmailHash) {
               details.push({ label: 'Email Hash', value: tx.EmailHash, icon: '📧' });
          }
          if (tx.MessageKey) {
               details.push({ label: 'Message Key', value: shortenAddress(tx.MessageKey), icon: '🔑' });
          }
          if (tx.TransferRate !== undefined) {
               const rate = tx.TransferRate === 0 ? '0%' : `${(tx.TransferRate / 1000000000 - 1) * 100}%`;
               details.push({ label: 'Transfer Rate', value: rate, icon: '💱' });
          }
          if (tx.TickSize !== undefined) {
               details.push({ label: 'Tick Size', value: tx.TickSize, icon: '📏' });
          }

          // Account flags
          const flags = this.getAccountSetFlags(tx);
          if (flags.length > 0) {
               details.push({ label: 'Flags Set', value: flags.join(', '), icon: '🚩' });
          }

          details.push({ label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' }, { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }

     private getAccountSetChanges(tx: any): string[] {
          const changes = [];
          if (tx.Domain) changes.push('Domain');
          if (tx.EmailHash) changes.push('Email Hash');
          if (tx.MessageKey) changes.push('Message Key');
          if (tx.TransferRate !== undefined) changes.push('Transfer Rate');
          if (tx.TickSize !== undefined) changes.push('Tick Size');
          if (tx.SetFlag) changes.push(`Flag ${tx.SetFlag}`);
          if (tx.ClearFlag) changes.push(`Cleared Flag ${tx.ClearFlag}`);
          return changes;
     }

     private getAccountSetFlags(tx: any): string[] {
          const flags = [];
          const flagMap: Record<number, string> = {
               1: 'Require Destination Tag',
               2: 'Require Authorization',
               3: 'Disallow XRP',
               4: 'Disable Master Key',
               5: 'Account Transaction ID',
               6: 'No Freeze',
               7: 'Global Freeze',
               8: 'Default Ripple',
               9: 'Deposit Auth',
               10: 'Authorized NFToken Minting',
          };

          if (tx.SetFlag && flagMap[tx.SetFlag]) {
               flags.push(flagMap[tx.SetFlag]);
          }
          if (tx.ClearFlag && flagMap[tx.ClearFlag]) {
               flags.push(`Cleared: ${flagMap[tx.ClearFlag]}`);
          }

          return flags;
     }
}

// 4. TrustSet Formatter
export class TrustSetFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const limit = tx.LimitAmount;
          const isRemove = limit.value === '0';

          return {
               title: isRemove ? 'Trust Line Removed' : 'Trust Line Created',
               description: isRemove ? `Removed trust line for ${limit.currency} issued by ${shortenAddress(limit.issuer)}` : `Set trust limit of ${limit.value} ${limit.currency} from ${shortenAddress(limit.issuer)}`,
               amount: isRemove ? undefined : `${limit.value} ${limit.currency}`,
               from: tx.Account,
               to: limit.issuer,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const limit = tx.LimitAmount;
          const details = [
               { label: 'Currency', value: limit.currency, icon: '💱' },
               { label: 'Issuer', value: shortenAddress(limit.issuer), icon: '🏦' },
               { label: 'Limit', value: limit.value === '0' ? 'Removed' : limit.value, icon: '📊' },
               { label: 'Quality In', value: tx.QualityIn || 'None', icon: '📈' },
               { label: 'Quality Out', value: tx.QualityOut || 'None', icon: '📉' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];

          return details;
     }
}

// 5. EscrowCreate Formatter
export class EscrowCreateFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'Escrow Created',
               description: `Created escrow holding ${formatXRPAmount(tx.Amount)} until conditions are met`,
               amount: formatXRPAmount(tx.Amount),
               from: tx.Account,
               to: tx.Destination,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [
               { label: 'Amount', value: formatXRPAmount(tx.Amount), icon: '💰' },
               { label: 'Destination', value: shortenAddress(tx.Destination), icon: '🎯' },
               { label: 'Destination Tag', value: tx.DestinationTag || 'None', icon: '🏷️' },
               { label: 'Cancel After', value: tx.CancelAfter ? formatDate(tx.CancelAfter) : 'Never', icon: '❌' },
               { label: 'Finish After', value: tx.FinishAfter ? formatDate(tx.FinishAfter) : 'Immediate', icon: '✅' },
               { label: 'Condition', value: formatCondition(tx.Condition), icon: '🔒' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'AccountSequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];

          return details;
     }
}

// 6. EscrowFinish Formatter
export class EscrowFinishFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'Escrow Finished',
               description: `Released funds from escrow sequence ${tx.OwnerSequence}`,
               from: tx.Account,
               to: tx.Destination || tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [
               { label: 'Owner', value: shortenAddress(tx.Owner), icon: '👤' },
               { label: 'Offer Sequence', value: tx.OfferSequence, icon: '🔢' },
               { label: 'Condition', value: formatCondition(tx.Condition), icon: '🔓' },
               { label: 'Fulfillment', value: formatCondition(tx.Fulfillment), icon: '✅' },
          ];

          // Find released amount from metadata
          let releasedAmount = '';
          if (meta?.AffectedNodes) {
               for (const node of meta.AffectedNodes) {
                    if (node.ModifiedNode?.LedgerEntryType === 'Escrow' && node.ModifiedNode.PreviousFields?.Amount) {
                         releasedAmount = formatXRPAmount(node.ModifiedNode.PreviousFields.Amount);
                         break;
                    }
               }
          }

          if (releasedAmount) {
               details.unshift({ label: 'Amount Released', value: releasedAmount, icon: '💰' });
          }

          details.push({ label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 7. EscrowCancel Formatter
export class EscrowCancelFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'Escrow Cancelled',
               description: `Cancelled escrow from owner ${shortenAddress(tx.Owner)} (sequence ${tx.OfferSequence})`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          return [
               { label: 'Owner', value: shortenAddress(tx.Owner), icon: '👤' },
               { label: 'Offer Sequence', value: tx.OfferSequence, icon: '🔢' },
               { label: 'Cancelled By', value: shortenAddress(tx.Account), icon: '❌' },
               { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];
     }
}

// 8. PaymentChannelCreate Formatter
export class PaymentChannelCreateFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'Payment Channel Created',
               description: `Created payment channel to ${shortenAddress(tx.Destination)} with ${formatXRPAmount(tx.Amount)}`,
               amount: formatXRPAmount(tx.Amount),
               from: tx.Account,
               to: tx.Destination,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const settleDelaySeconds = tx.SettleDelay;
          const settleDelayDays = (settleDelaySeconds / 86400).toFixed(1);

          return [
               { label: 'Amount', value: formatXRPAmount(tx.Amount), icon: '💰' },
               { label: 'Destination', value: shortenAddress(tx.Destination), icon: '🎯' },
               { label: 'Destination Tag', value: tx.DestinationTag || 'None', icon: '🏷️' },
               { label: 'Settle Delay', value: `${settleDelayDays} days (${settleDelaySeconds} seconds)`, icon: '⏱️' },
               { label: 'Public Key', value: shortenAddress(tx.PublicKey), icon: '🔑' },
               { label: 'Cancel After', value: tx.CancelAfter ? formatDate(tx.CancelAfter) : 'Never', icon: '❌' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];
     }
}

// 9. PaymentChannelClaim Formatter
export class PaymentChannelClaimFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const amount = tx.Balance ? formatXRPAmount(tx.Balance) : 'some';
          const isClose = tx.Flags === 1; // tfClose

          return {
               title: isClose ? 'Payment Channel Closed' : 'Payment Channel Claim',
               description: isClose ? `Closed payment channel ${shortenAddress(tx.Channel)}` : `Claimed ${amount} from payment channel`,
               amount: tx.Balance ? formatXRPAmount(tx.Balance) : undefined,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [
               { label: 'Channel ID', value: shortenAddress(tx.Channel), icon: '📡' },
               { label: 'Balance', value: tx.Balance ? formatXRPAmount(tx.Balance) : 'Channel amount', icon: '💰' },
               { label: 'Amount', value: tx.Amount ? formatXRPAmount(tx.Amount) : 'All', icon: '💵' },
               { label: 'Public Key', value: shortenAddress(tx.PublicKey), icon: '🔑' },
               { label: 'Signature', value: shortenAddress(tx.Signature), icon: '✍️' },
          ];

          if (tx.Flags & 1) {
               details.push({ label: 'Action', value: 'Closing channel', icon: '🔒' });
          } else if (tx.Flags & 2) {
               details.push({ label: 'Action', value: 'Renew channel', icon: '🔄' });
          }

          details.push({ label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 10. PaymentChannelFund Formatter
export class PaymentChannelFundFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'Payment Channel Funded',
               description: `Added ${formatXRPAmount(tx.Amount)} to payment channel`,
               amount: formatXRPAmount(tx.Amount),
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          return [
               { label: 'Channel ID', value: shortenAddress(tx.Channel), icon: '📡' },
               { label: 'Amount Added', value: formatXRPAmount(tx.Amount), icon: '💰' },
               { label: 'Expiration', value: tx.Expiration ? formatDate(tx.Expiration) : 'Unchanged', icon: '⏰' },
               { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];
     }
}

// 11. SignerListSet Formatter
export class SignerListSetFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const signerCount = tx.SignerEntries?.length || 0;
          const isRemoval = signerCount === 0;

          return {
               title: isRemoval ? 'Signer List Removed' : 'Signer List Updated',
               description: isRemoval ? 'Removed multi-signing signer list' : `Set up multi-signing with ${signerCount} signer${signerCount === 1 ? '' : 's'}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [{ label: 'Signer Quorum', value: tx.SignerQuorum, icon: '📊' }];

          if (tx.SignerEntries && tx.SignerEntries.length > 0) {
               details.push({
                    label: 'Signers',
                    value: tx.SignerEntries.map((s: any) => {
                         const weight = s.SignerEntry.WalletLocator?.Weight || s.SignerEntry.SignerWeight;
                         const address = shortenAddress(s.SignerEntry.Account);
                         return `${address} (weight: ${weight})`;
                    }).join(', '),
                    icon: '✍️',
               });
          }

          details.push({ label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' }, { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 12. NFTokenMint Formatter
export class NFTokenMintFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const isBurnable = tx.Flags & 1;
          const isTransferable = tx.Flags & 2;

          return {
               title: 'NFT Minted',
               description: `Minted new NFT${isBurnable ? ' (burnable)' : ''}${isTransferable ? ' (transferable)' : ''}`,
               from: tx.Account,
               to: tx.NFTokenTaxon ? `Taxon: ${tx.NFTokenTaxon}` : undefined,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [
               { label: 'NFT ID', value: formatNFTokenID(tx.NFTokenID || 'New'), icon: '🖼️' },
               { label: 'Taxon', value: tx.NFTokenTaxon, icon: '🔢' },
               { label: 'URI', value: tx.URI ? atob(tx.URI) : 'None', icon: '🔗' },
               { label: 'Transfer Fee', value: tx.TransferFee ? `${tx.TransferFee / 1000}%` : '0%', icon: '💸' },
               { label: 'Issuer', value: shortenAddress(tx.Issuer || tx.Account), icon: '👤' },
          ];

          // Parse flags
          const flags = [];
          if (tx.Flags & 1) flags.push('Burnable');
          if (tx.Flags & 2) flags.push('Transferable');
          if (tx.Flags & 8) flags.push('Only XRP');
          if (flags.length) {
               details.push({ label: 'Properties', value: flags.join(', '), icon: '⭐' });
          }

          details.push({ label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 13. NFTokenBurn Formatter
export class NFTokenBurnFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          return {
               title: 'NFT Burned',
               description: `Burned NFT ${formatNFTokenID(tx.NFTokenID)}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          return [
               { label: 'NFT ID', value: formatNFTokenID(tx.NFTokenID), icon: '🖼️' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' },
          ];
     }
}

// 14. NFTokenCreateOffer Formatter
export class NFTokenCreateOfferFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const isSellOffer = tx.Flags === 1; // tfSellNFToken
          const amount = formatCurrencyAmount(tx.Amount);
          const owner = shortenAddress(tx.Owner);

          return {
               title: isSellOffer ? 'NFT Sell Offer Created' : 'NFT Buy Offer Created',
               description: isSellOffer ? `Offering to sell NFT for ${amount}` : `Offering to buy NFT from ${owner} for ${amount}`,
               amount: amount,
               from: tx.Account,
               to: tx.Destination,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [
               { label: 'NFT ID', value: formatNFTokenID(tx.NFTokenID), icon: '🖼️' },
               { label: 'Amount', value: formatCurrencyAmount(tx.Amount), icon: '💰' },
               { label: 'Owner', value: shortenAddress(tx.Owner), icon: '👤' },
               { label: 'Destination', value: tx.Destination ? shortenAddress(tx.Destination) : 'Anyone', icon: '🎯' },
               { label: 'Expiration', value: tx.Expiration ? formatDate(tx.Expiration) : 'Never', icon: '⏰' },
               { label: 'Offer Type', value: tx.Flags === 1 ? 'Sell Offer' : 'Buy Offer', icon: '🏷️' },
          ];

          if (tx.Flags === 1 && tx.Owner !== tx.Account) {
               details.push({ label: 'Note', value: 'Selling on behalf of owner', icon: '📝' });
          }

          details.push({ label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 15. NFTokenAcceptOffer Formatter
export class NFTokenAcceptOfferFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const hasSellOffer = !!tx.SellOffer;
          const hasBuyOffer = !!tx.BuyOffer;

          let description = '';
          if (hasSellOffer && hasBuyOffer) {
               description = 'Accepted both buy and sell offers';
          } else if (hasSellOffer) {
               description = 'Accepted sell offer';
          } else {
               description = 'Accepted buy offer';
          }

          return {
               title: 'NFT Offer Accepted',
               description: description,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [];

          if (tx.SellOffer) {
               details.push({ label: 'Sell Offer ID', value: shortenAddress(tx.SellOffer), icon: '💰' });
          }
          if (tx.BuyOffer) {
               details.push({ label: 'Buy Offer ID', value: shortenAddress(tx.BuyOffer), icon: '💵' });
          }
          if (tx.NFTokenID) {
               details.push({ label: 'NFT ID', value: formatNFTokenID(tx.NFTokenID), icon: '🖼️' });
          }

          details.push({ label: 'Buyer', value: shortenAddress(tx.Account), icon: '👤' }, { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 16. NFTokenCancelOffer Formatter
export class NFTokenCancelOfferFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const offerCount = tx.NFTokenOffers?.length || 0;
          return {
               title: 'NFT Offer Cancelled',
               description: `Cancelled ${offerCount} NFT offer${offerCount === 1 ? '' : 's'}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const details = [];

          if (tx.NFTokenOffers && tx.NFTokenOffers.length > 0) {
               details.push({
                    label: 'Cancelled Offers',
                    value: tx.NFTokenOffers.map((offer: string) => shortenAddress(offer)).join(', '),
                    icon: '🗑️',
               });
          }

          details.push({ label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' }, { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// PermissionedDomainDelete formatter (based on your example)
class PermissionedDomainDeleteFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any) {
          return {
               title: 'Permissioned Domain Deleted',
               description: `Successfully deleted permissioned domain configuration`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any): KeyDetail[] {
          // Extract credentials that were removed
          const removedCredentials: string[] = [];
          if (meta?.AffectedNodes) {
               meta.AffectedNodes.forEach((node: any) => {
                    if (node.DeletedNode?.FinalFields?.AcceptedCredentials) {
                         node.DeletedNode.FinalFields.AcceptedCredentials.forEach((cred: any) => {
                              removedCredentials.push(`${cred.Credential.CredentialType} (${this.shortenAddress(cred.Credential.Issuer)})`);
                         });
                    }
               });
          }

          const details: KeyDetail[] = [
               { label: 'Domain ID', value: tx.DomainID?.slice(0, 20) + '...', icon: '🆔' },
               { label: 'Account Sequence', value: tx.Sequence, icon: '🔢' },
               { label: 'Fee', value: `${(Number.parseInt(tx.Fee) / 1000000).toFixed(6)} XRP`, icon: '⛽' },
          ];

          if (removedCredentials.length > 0) {
               details.push({
                    label: 'Removed Credentials',
                    type: 'credential-list',
                    credentials: removedCredentials.map((str: string) => {
                         const trimmed = str.trim();

                         // Find the last occurrence of " ("
                         const lastOpenParen = trimmed.lastIndexOf(' (');

                         if (lastOpenParen === -1) {
                              return { type: trimmed, issuer: 'N/A' };
                         }

                         const type = trimmed.substring(0, lastOpenParen).trim();
                         const issuer = trimmed.substring(lastOpenParen + 2, trimmed.length - 1).trim();

                         return {
                              type: Buffer.from(type, 'hex').toString('utf8') || 'N/A',
                              issuer: issuer || 'N/A',
                         };
                    }),
                    // value: removedCredentials.join(', '),
                    icon: '🗑️',
               });
          }

          return details;
     }

     private shortenAddress(address: string): string {
          if (!address) return 'Unknown';
          return `${address.slice(0, 6)}...${address.slice(-4)}`;
     }
}

// 17. PermissionedDomainCreate Formatter
export class PermissionedDomainCreateFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const credentialCount = tx.InitialAcceptedCredentials?.length || 0;
          return {
               title: 'Permissioned Domain Created',
               description: `Created new permissioned domain with ${credentialCount} initial credential${credentialCount === 1 ? '' : 's'}`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any): KeyDetail[] {
          const details: KeyDetail[] = [
               { label: 'Domain ID', value: shortenAddress(tx.DomainID), icon: '🆔' },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
          ];

          if (tx.InitialAcceptedCredentials && tx.InitialAcceptedCredentials.length > 0) {
               details.push({
                    label: 'Initial Credentials',
                    type: 'credential-list',
                    credentials: tx.InitialAcceptedCredentials.map((cred: any) => ({
                         type: Buffer.from(cred.Credential.CredentialType, 'hex').toString('utf8') || 'N/A',
                         issuer: shortenAddress(cred.Credential.Issuer),
                    })),
                    icon: '🔐',
               });
          }

          details.push({ label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 18. PermissionedDomainSet Formatter
export class PermissionedDomainSetFormatter implements TransactionFormatter {
     getSummary(tx: any, meta: any): ParsedTransactionResult['summary'] {
          const hasAdditions = tx.AcceptedCredentials?.length > 0;
          const hasRemovals = tx.AcceptedCredentialsToRemove?.length > 0;

          let description = '';
          if (hasAdditions && hasRemovals) {
               description = 'Added and removed credentials from permissioned domain';
          } else if (hasAdditions) {
               description = 'Added credentials to permissioned domain';
          } else if (hasRemovals) {
               description = 'Removed credentials from permissioned domain';
          } else {
               description = 'Updated permissioned domain settings';
          }

          return {
               title: 'Permissioned Domain Set',
               description: description,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any): KeyDetail[] {
          const details: KeyDetail[] = [];

          if (tx.DomainID != null && tx.DomainID !== '') {
               details.push({
                    label: 'Domain ID',
                    value: shortenAddress(tx.DomainID),
                    icon: '🆔',
               });
          }

          details.push({
               label: 'Owner',
               value: shortenAddress(tx.Account),
               icon: '👤',
          });

          if (tx.AcceptedCredentials?.length > 0) {
               details.push({
                    label: 'Credentials Added',
                    type: 'credential-list',
                    credentials: tx.AcceptedCredentials.map((cred: any) => ({
                         type: Buffer.from(cred.Credential.CredentialType, 'hex').toString('utf8') || 'N/A',
                         issuer: shortenAddress(cred.Credential.Issuer),
                    })),
                    icon: '➕',
               });
          }

          if (tx.AcceptedCredentialsToRemove?.length > 0) {
               details.push({
                    label: 'Credentials Removed',
                    type: 'credential-list',
                    credentials: tx.AcceptedCredentialsToRemove.map((cred: any) => ({
                         type: Buffer.from(cred.Credential.CredentialType, 'hex').toString('utf8') || 'N/A',
                         issuer: shortenAddress(cred.Credential.Issuer),
                    })),
                    icon: '➖',
               });
          }

          details.push({ label: 'Account Sequence', value: tx.Sequence, icon: '🔢' }, { label: 'Fee', value: formatXRPAmount(tx.Fee), icon: '⛽' });

          return details;
     }
}

// 11. DidSetPreviewFormatter Preview Formatter
class DidSetPreviewFormatter implements TransactionFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Set DID',
               description: 'Successfully set the DID for this account',
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [{ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' }];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'DID',
                    value: tx.DID,
                    isValid: !!tx.DID,
                    message: tx.DID ? undefined : 'DID is required',
               },
          ];
     }
}

// 12. DidDeletePreviewFormatter Preview Formatter
class DidDeletePreviewFormatter implements TransactionFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Delete DID',
               description: 'Successfully deleted this DID',
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [{ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' }];
     }

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return ['⚠️ This action cannot be undone. The DID will be permanently deleted.'];
     }
}

// Generic formatter for other transaction types
class GenericFormatter implements TransactionFormatter {
     constructor(private readonly txType: string) {}

     getSummary(tx: any, meta: any) {
          return {
               title: `${this.txType} Transaction`,
               description: `Transaction completed successfully`,
               from: tx.Account,
          };
     }

     getKeyDetails(tx: any, meta: any) {
          const excludeFields = new Set(['Account', 'SigningPubKey', 'TxnSignature', 'hash']);
          return Object.entries(tx)
               .filter(([key]) => !excludeFields.has(key))
               .map(([key, value]) => ({
                    label: key,
                    value: this.formatValue(value),
                    icon: this.getIconForField(key),
               }));
     }

     private formatValue(value: any): string {
          if (typeof value === 'string' && value.length > 30) {
               return value.slice(0, 27) + '...';
          }
          return String(value);
     }

     private getIconForField(field: string): string {
          const icons: Record<string, string> = {
               Amount: '💰',
               Destination: '🎯',
               Fee: '⛽',
               Sequence: '🔢',
               Flags: '🚩',
               LastLedgerSequence: '📒',
          };
          return icons[field] || '📄';
     }
}

function formatXRPAmount(drops: string | number): string {
     const amount = typeof drops === 'string' ? Number.parseInt(drops) : drops;
     return `${(amount / 1000000).toFixed(6)} XRP`;
}

function formatCurrencyAmount(amount: any): string {
     if (!amount) return '0';
     if (typeof amount === 'string') {
          return formatXRPAmount(amount);
     }
     if (amount.currency && amount.issuer) {
          const value = Number.parseFloat(amount.value).toFixed(6);
          return `${value} ${amount.currency}`;
     }
     return String(amount);
}

function shortenAddress(address: string): string {
     if (!address || address.length < 10) return address || 'Unknown';
     return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): string {
     if (!timestamp) return 'N/A';
     return new Date(timestamp * 1000).toLocaleString();
}

function formatCondition(condition: string): string {
     if (!condition) return 'None';
     // Condition is typically a PREIMAGE-SHA-256 hash
     return condition.length > 20 ? condition.slice(0, 20) + '...' : condition;
}

function formatNFTokenID(tokenID: string): string {
     if (!tokenID) return 'Unknown';
     return tokenID.length > 16 ? tokenID.slice(0, 16) + '...' : tokenID;
}
