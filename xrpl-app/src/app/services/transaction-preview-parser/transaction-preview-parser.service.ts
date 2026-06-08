import { Injectable } from '@angular/core';

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

export interface ParsedTransactionPreview {
     transactionType: string;
     summary: {
          title: string;
          description: string;
          warning?: string;
          estimatedFee?: string;
     };
     keyDetails: KeyDetail[];
     requiredFields?: Array<{
          label: string;
          value: string | number;
          isValid: boolean;
          message?: string;
     }>;
     warnings?: string[];
     estimatedImpact: {
          xrpUsed: string;
          sequence: number;
          lastLedger?: number;
          ticketSequence?: number;
     };
     rawData?: any;
}

@Injectable({ providedIn: 'root' })
export class TransactionPreviewParserService {
     parse(tx: any, accountInfo?: any): ParsedTransactionPreview {
          const transactionType = tx.TransactionType;
          const formatter = this.getPreviewFormatter(transactionType);

          const summary = formatter.getSummary(tx, accountInfo);
          let keyDetails = formatter.getKeyDetails(tx, accountInfo);
          const requiredFields = formatter.getRequiredFields(tx);
          const warnings = formatter.getWarnings(tx, accountInfo);

          // Add memos and signers
          keyDetails = this.addMemosToKeyDetails(keyDetails, tx);
          keyDetails = this.addSignersToKeyDetails(keyDetails, tx);

          // Calculate estimated XRP impact
          const fee = Number.parseInt(tx.Fee || '12');
          let xrpUsed = formatXRPAmount(fee);

          if (transactionType === 'Payment' && tx.Amount && typeof tx.Amount === 'string') {
               const amount = Number.parseInt(tx.Amount);
               xrpUsed = formatXRPAmount(fee + amount);
          }

          return {
               transactionType: transactionType || 'Unknown',
               summary: {
                    title: summary.title || 'Transaction',
                    description: summary.description || 'Review transaction details',
                    estimatedFee: summary.estimatedFee || formatXRPAmount(fee),
               },
               keyDetails: keyDetails || [],
               requiredFields: requiredFields || [],
               warnings: warnings || [],
               estimatedImpact: {
                    xrpUsed: xrpUsed,
                    sequence: tx.Sequence || 0,
                    lastLedger: tx.LastLedgerSequence,
                    ticketSequence: tx.TicketSequence || 0,
               },
               rawData: tx,
          };
     }

     private getPreviewFormatter(transactionType: string): TransactionPreviewFormatter {
          const formatters: Record<string, TransactionPreviewFormatter> = {
               Payment: new PaymentPreviewFormatter(),
               OfferCreate: new OfferCreatePreviewFormatter(),
               OfferCancel: new OfferCancelPreviewFormatter(),
               AccountSet: new AccountSetPreviewFormatter(),
               TrustSet: new TrustSetPreviewFormatter(),
               EscrowCreate: new EscrowCreatePreviewFormatter(),
               EscrowFinish: new EscrowFinishPreviewFormatter(),
               EscrowCancel: new EscrowCancelPreviewFormatter(),
               PaymentChannelCreate: new PaymentChannelCreatePreviewFormatter(),
               PaymentChannelClaim: new PaymentChannelClaimPreviewFormatter(),
               PaymentChannelFund: new PaymentChannelFundPreviewFormatter(),
               SignerListSet: new SignerListSetPreviewFormatter(),
               NFTokenMint: new NFTokenMintPreviewFormatter(),
               NFTokenBurn: new NFTokenBurnPreviewFormatter(),
               NFTokenCreateOffer: new NFTokenCreateOfferPreviewFormatter(),
               NFTokenAcceptOffer: new NFTokenAcceptOfferPreviewFormatter(),
               NFTokenCancelOffer: new NFTokenCancelOfferPreviewFormatter(),
               PermissionedDomainCreate: new PermissionedDomainCreatePreviewFormatter(),
               PermissionedDomainSet: new PermissionedDomainSetPreviewFormatter(),
               PermissionedDomainDelete: new PermissionedDomainDeletePreviewFormatter(),
               DIDSet: new DidSetPreviewFormatter(),
               DIDDelete: new DidDeletePreviewFormatter(),
          };

          return formatters[transactionType] || new GenericPreviewFormatter(transactionType);
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
                              account: s.Signer?.Account ? shortenAddress(s.Signer.Account) : 'Unknown',
                              signingPubKey: s.Signer?.SigningPubKey ? shortenAddress(s.Signer.SigningPubKey) : 'Unknown',
                              signature: s.Signer?.TxnSignature ? shortenAddress(s.Signer.TxnSignature) : undefined,
                         })),
                    },
               ];
          }
          return keyDetails;
     }
}

// Base interface
interface TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any): ParsedTransactionPreview['summary'];
     // getKeyDetails(tx: any, accountInfo?: any): Array<{ label: string; value: string | number; icon: string; highlight?: boolean }>;
     getKeyDetails(tx: any, meta: any): KeyDetail[];
     getRequiredFields(tx: any): Array<{ label: string; value: string | number; isValid: boolean; message?: string }>;
     getWarnings(tx: any, accountInfo?: any): string[];
}

// 1. Payment Preview Formatter
class PaymentPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const amount = formatCurrencyAmountPreview(tx.Amount);
          const isSelfPayment = tx.Account === tx.Destination;

          return {
               title: 'Payment Transaction',
               description: isSelfPayment ? `You're about to send ${amount} to yourself` : `You're about to send ${amount} to ${shortenAddress(tx.Destination)}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'Amount', value: formatCurrencyAmountPreview(tx.Amount ? tx.Amount : tx.DeliverMax), icon: '💰', highlight: true },
               { label: 'Sender', value: shortenAddress(tx.Account), icon: '📤' },
               { label: 'Receiver', value: shortenAddress(tx.Destination), icon: '📥' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
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

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Destination',
                    value: tx.Destination,
                    isValid: !!tx.Destination && tx.Destination.length === 34,
                    message: tx.Destination ? (tx.Destination.length === 34 ? undefined : 'Invalid XRP address format') : 'Destination address is required',
               },
               {
                    label: 'Amount',
                    value: tx.Amount,
                    isValid: !!tx.Amount,
                    message: tx.Amount ? undefined : 'Amount is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];
          const amount = typeof tx.Amount === 'string' ? Number.parseInt(tx.Amount) : 0;
          const fee = Number.parseInt(tx.Fee || '12');
          const totalCost = amount + fee;

          // Check balance
          if (accountInfo?.Balance) {
               const balance = Number.parseInt(accountInfo.Balance);
               if (totalCost > balance) {
                    warnings.push(`⚠️ Insufficient XRP balance. Required: ${formatXRPAmount(totalCost)}, Available: ${formatXRPAmount(balance)}`);
               } else if (totalCost > balance * 0.9) {
                    warnings.push(`⚠️ This transaction will use ${((totalCost / balance) * 100).toFixed(1)}% of your XRP balance`);
               }
          }

          // Check for high fee
          if (fee > 5000) {
               warnings.push(`⚠️ High transaction fee: ${formatXRPAmount(fee)} (${(fee / 12).toFixed(1)}x normal fee)`);
          }

          // Check for missing destination tag
          if (tx.DestinationTag === undefined && tx.Destination) {
               warnings.push(`ℹ️ No destination tag specified. Some exchanges require a destination tag.`);
          }

          return warnings;
     }
}

// 2. OfferCreate Preview Formatter
class OfferCreatePreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const takerGets = formatCurrencyAmountPreview(tx.TakerGets);
          const takerPays = formatCurrencyAmountPreview(tx.TakerPays);
          const isBuy = tx.Flags === 0;

          return {
               title: isBuy ? 'Buy Order' : 'Sell Order',
               description: `${isBuy ? 'Buying' : 'Selling'} ${takerGets} for ${takerPays}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const takerGets = formatCurrencyAmountPreview(tx.TakerGets);
          const takerPays = formatCurrencyAmountPreview(tx.TakerPays);
          const rate = this.calculateRate(tx);

          return [
               { label: 'You Get', value: takerGets, icon: '💰', highlight: true },
               { label: 'You Pay', value: takerPays, icon: '💳', highlight: true },
               { label: 'Exchange Rate', value: rate, icon: '📊' },
               { label: 'Order Type', value: tx.Flags === 0 ? 'Passive' : 'Immediate or Cancel', icon: '🏷️' },
               { label: 'Expiration', value: tx.Expiration ? formatDatePreview(tx.Expiration) : 'Never', icon: '⏰' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Taker Gets',
                    value: tx.TakerGets,
                    isValid: !!tx.TakerGets,
                    message: tx.TakerGets ? undefined : 'Required: What you receive',
               },
               {
                    label: 'Taker Pays',
                    value: tx.TakerPays,
                    isValid: !!tx.TakerPays,
                    message: tx.TakerPays ? undefined : 'Required: What you pay',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];
          const fee = Number.parseInt(tx.Fee || '12');

          // Check if selling XRP and balance is sufficient
          if (typeof tx.TakerPays === 'string' && tx.TakerPays !== '0') {
               const amount = Number.parseInt(tx.TakerPays);
               if (accountInfo?.Balance) {
                    const balance = Number.parseInt(accountInfo.Balance);
                    const totalCost = amount + fee;
                    if (totalCost > balance) {
                         warnings.push(`⚠️ Insufficient XRP balance. Required: ${formatXRPAmount(totalCost)}`);
                    }
               }
          }

          // Check for high fee
          if (fee > 5000) {
               warnings.push(`⚠️ High transaction fee: ${formatXRPAmount(fee)}`);
          }

          return warnings;
     }

     private calculateRate(tx: any): string {
          try {
               let gets = 0,
                    pays = 0;

               if (typeof tx.TakerGets === 'string') {
                    gets = Number.parseInt(tx.TakerGets);
               } else {
                    gets = Number.parseInt(tx.TakerGets.value);
               }

               if (typeof tx.TakerPays === 'string') {
                    pays = Number.parseInt(tx.TakerPays);
               } else {
                    pays = Number.parseInt(tx.TakerPays.value);
               }

               if (gets === 0) return 'N/A';
               const rate = pays / gets;
               return rate.toFixed(6);
          } catch {
               return 'N/A';
          }
     }
}

// 3. OfferCancel Preview Formatter
class OfferCancelPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Cancel Order',
               description: `Cancel order #${tx.OfferSequence}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'Order ID', value: tx.OfferSequence, icon: '🔢', highlight: true },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
               { label: 'Sequence', value: tx.Sequence, icon: '🔢' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Offer Sequence',
                    value: tx.OfferSequence,
                    isValid: !!tx.OfferSequence,
                    message: tx.OfferSequence ? undefined : 'Order ID is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// 4. AccountSet Preview Formatter
class AccountSetPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const changes = this.getChanges(tx);
          return {
               title: 'Update Account Settings',
               description: `You're about to update: ${changes.join(', ')}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [];

          if (tx.Domain) {
               details.push({ label: 'Domain', value: atob(tx.Domain), icon: '🌐' });
          }
          if (tx.EmailHash) {
               details.push({ label: 'Email Hash', value: tx.EmailHash.substring(0, 20) + '...', icon: '📧' });
          }
          if (tx.TransferRate !== undefined) {
               const rate = tx.TransferRate === 0 ? '0%' : `${((tx.TransferRate - 1000000000) / 10000000).toFixed(2)}%`;
               details.push({ label: 'Transfer Rate', value: rate, icon: '💱' });
          }
          if (tx.TickSize !== undefined) {
               details.push({ label: 'Tick Size', value: tx.TickSize, icon: '📏' });
          }

          details.push({ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' }, { label: 'Sequence', value: tx.Sequence, icon: '🔢' });

          return details;
     }

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];

          // Warn about disabling master key
          if (tx.SetFlag === 4 || tx.ClearFlag === 4) {
               warnings.push(`⚠️ Disabling master key prevents recovery if you lose your regular key`);
          }

          // Warn about Default Ripple
          if (tx.SetFlag === 8) {
               warnings.push(`ℹ️ Enabling Default Ripple allows balances to ripple through this account`);
          }

          return warnings;
     }

     private getChanges(tx: any): string[] {
          const changes = [];
          if (tx.Domain) changes.push('Domain');
          if (tx.EmailHash) changes.push('Email Hash');
          if (tx.TransferRate !== undefined) changes.push('Transfer Rate');
          if (tx.TickSize !== undefined) changes.push('Tick Size');
          if (tx.SetFlag) changes.push(`Flag ${tx.SetFlag}`);
          return changes;
     }
}

// 5. TrustSet Preview Formatter
class TrustSetPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const limit = tx.LimitAmount;
          const isRemove = limit.value === '0';

          return {
               title: isRemove ? 'Remove Trust Line' : 'Add Trust Line',
               description: isRemove ? `Remove trust for ${limit.currency}` : `Trust ${limit.currency} issued by ${shortenAddress(limit.issuer)} up to ${limit.value}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const limit = tx.LimitAmount;
          return [
               { label: 'Currency', value: limit.currency, icon: '💱', highlight: true },
               { label: 'Issuer', value: shortenAddress(limit.issuer), icon: '🏦' },
               { label: 'Limit', value: limit.value === '0' ? 'Removing' : limit.value, icon: '📊' },
               { label: 'Quality In', value: tx.QualityIn || 'None', icon: '📈' },
               { label: 'Quality Out', value: tx.QualityOut || 'None', icon: '📉' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          const limit = tx.LimitAmount;
          return [
               {
                    label: 'Currency',
                    value: limit?.currency,
                    isValid: !!limit?.currency,
                    message: limit?.currency ? undefined : 'Currency is required',
               },
               {
                    label: 'Issuer',
                    value: limit?.issuer,
                    isValid: !!limit?.issuer && limit.issuer.length === 34,
                    message: limit?.issuer ? (limit.issuer.length === 34 ? undefined : 'Invalid issuer address') : 'Issuer address is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];
          const limit = tx.LimitAmount;

          if (limit?.currency && limit.currency.length > 3) {
               warnings.push(`ℹ️ Custom currency code: ${limit.currency}`);
          }

          return warnings;
     }
}

// 6. NFTokenMint Preview Formatter
class NFTokenMintPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const isBurnable = tx.Flags & 1;
          const isTransferable = tx.Flags & 2;
          const properties = [];
          if (isBurnable) properties.push('burnable');
          if (isTransferable) properties.push('transferable');

          return {
               title: 'Mint NFT',
               description: `Create a new NFT${properties.length ? ` (${properties.join(', ')})` : ''}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [
               { label: 'Taxon', value: tx.NFTokenTaxon, icon: '🔢', highlight: true },
               { label: 'Transfer Fee', value: tx.TransferFee ? `${tx.TransferFee / 1000}%` : '0%', icon: '💸' },
               { label: 'URI', value: tx.URI ? atob(tx.URI).substring(0, 50) + (tx.URI.length > 50 ? '...' : '') : 'None', icon: '🔗' },
          ];

          if (tx.Issuer && tx.Issuer !== tx.Account) {
               details.push({ label: 'Issuer', value: shortenAddress(tx.Issuer), icon: '👤' });
          }

          details.push({ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' });

          return details;
     }

     getRequiredFields(tx: any) {
          const required = [
               {
                    label: 'Taxon',
                    value: tx.NFTokenTaxon,
                    isValid: tx.NFTokenTaxon !== undefined,
                    message: tx.NFTokenTaxon === undefined ? 'Taxon is required' : undefined,
               },
          ];

          if (tx.TransferFee && tx.TransferFee > 0) {
               if (tx.TransferFee > 50000) {
                    required.push({
                         label: 'Transfer Fee',
                         value: tx.TransferFee,
                         isValid: false,
                         message: 'Transfer fee cannot exceed 50% (50000)',
                    });
               }
          }

          return required;
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];

          if (tx.TransferFee && tx.TransferFee > 10000) {
               warnings.push(`⚠️ High transfer fee: ${tx.TransferFee / 1000}% (max is 50%)`);
          }

          if (!tx.URI) {
               warnings.push(`ℹ️ No URI provided. NFT will not have associated metadata.`);
          }

          return warnings;
     }
}

// 7. NFTokenCreateOffer Preview Formatter
class NFTokenCreateOfferPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const isSellOffer = tx.Flags === 1;
          const amount = formatCurrencyAmountPreview(tx.Amount);

          return {
               title: isSellOffer ? 'Create Sell Offer' : 'Create Buy Offer',
               description: isSellOffer ? `Offer to sell NFT for ${amount}` : `Offer to buy NFT for ${amount}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [
               { label: 'NFT ID', value: shortenAddress(tx.NFTokenID), icon: '🖼️', highlight: true },
               { label: 'Amount', value: formatCurrencyAmountPreview(tx.Amount), icon: '💰', highlight: true },
          ];

          if (tx.Destination) {
               details.push({
                    label: 'Destination',
                    value: shortenAddress(tx.Destination),
                    icon: '🎯',
                    highlight: false,
               });
          }

          if (tx.Expiration) {
               details.push({
                    label: 'Expires',
                    value: formatDatePreview(tx.Expiration),
                    icon: '⏰',
                    highlight: false,
               });
          }

          details.push({
               label: 'Fee',
               value: formatXRPAmount(tx.Fee || '12'),
               icon: '⛽',
               highlight: false,
          });

          return details;
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'NFT ID',
                    value: tx.NFTokenID,
                    isValid: !!tx.NFTokenID,
                    message: tx.NFTokenID ? undefined : 'NFT ID is required',
               },
               {
                    label: 'Amount',
                    value: tx.Amount,
                    isValid: !!tx.Amount,
                    message: tx.Amount ? undefined : 'Amount is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];

          if (tx.Flags === 1 && tx.Owner !== tx.Account) {
               warnings.push(`ℹ️ You're selling an NFT you don't own. Make sure you have authorization.`);
          }

          return warnings;
     }
}

// 8. PermissionedDomainCreate Preview Formatter
class PermissionedDomainCreatePreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const credentialCount = tx.InitialAcceptedCredentials?.length || 0;
          return {
               title: 'Create Permissioned Domain',
               description: `Create a new domain with ${credentialCount} initial credential${credentialCount === 1 ? '' : 's'}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
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

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];

          if (!tx.InitialAcceptedCredentials || tx.InitialAcceptedCredentials.length === 0) {
               warnings.push(`ℹ️ Domain created with no credentials. No one can access it until credentials are added.`);
          }

          return warnings;
     }
}

// 9. PermissionedDomainSet Preview Formatter
class PermissionedDomainSetPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const additions = tx.AcceptedCredentialsToAdd?.length || 0;
          const removals = tx.AcceptedCredentialsToRemove?.length || 0;

          let description = '';
          if (additions && removals) {
               description = `Add ${additions} and remove ${removals} credentials`;
          } else if (additions) {
               description = `Add ${additions} credential${additions === 1 ? '' : 's'}`;
          } else if (removals) {
               description = `Remove ${removals} credential${removals === 1 ? '' : 's'}`;
          }

          return {
               title: 'Set Permissioned Domain',
               description: description,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, meta: any): KeyDetail[] {
          const details: KeyDetail[] = [];

          if (tx.AcceptedCredentials?.length > 0) {
               details.push({
                    label: 'Credentials',
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
                    label: 'Credentials',
                    type: 'credential-list',
                    credentials: tx.AcceptedCredentialsToRemove.map((cred: any) => ({
                         type: Buffer.from(cred.Credential.CredentialType, 'hex').toString('utf8') || 'N/A',
                         issuer: shortenAddress(cred.Credential.Issuer),
                    })),
                    icon: '➖',
               });
          }

          if (tx.Sequence != null && tx.Sequence !== 0) {
               details.push({
                    label: 'Account Sequence',
                    value: tx.Sequence,
                    icon: '🔢',
               });
          }

          details.push({
               label: 'Fee',
               value: formatXRPAmount(tx.Fee),
               icon: '⛽',
          });

          return details;
     }

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// 10. PermissionedDomainDelete Preview Formatter
class PermissionedDomainDeletePreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Delete Permissioned Domain',
               description: 'Permanently delete this permissioned domain',
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, meta: any): KeyDetail[] {
          // Extract credentials that were removed
          const removedCredentials: string[] = [];
          if (meta?.AffectedNodes) {
               meta.AffectedNodes.forEach((node: any) => {
                    if (node.DeletedNode?.FinalFields?.AcceptedCredentials) {
                         node.DeletedNode.FinalFields.AcceptedCredentials.forEach((cred: any) => {
                              removedCredentials.push(`${cred.Credential.CredentialType} (${cred.Credential.Issuer})`);
                         });
                    }
               });
          }

          const details: KeyDetail[] = [
               { label: 'Domain ID', value: tx.DomainID?.slice(0, 20) + '...', icon: '🆔' },
               { label: 'Fee', value: `${(Number.parseInt(tx.Fee) / 1000000).toFixed(6)} XRP`, icon: '⛽' },
          ];

          if (removedCredentials.length > 0) {
               details.push({
                    label: 'Removed Credentials',
                    value: removedCredentials.join(', '),
                    icon: '🗑️',
               });
          }

          return details;
     }

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// 11. DidSetPreviewFormatter Preview Formatter
class DidSetPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Set DID',
               description: 'Successfully set the DID for this account',
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'DID DIDDocument', value: tx.DIDDocument ? prettyJson(Buffer.from(tx.DIDDocument, 'hex').toString('utf8')) : 'N/A', icon: '🆔', highlight: true },
               { label: 'DID Data', value: tx.Data ? prettyJson(Buffer.from(tx.Data, 'hex').toString('utf8')) : 'N/A', icon: '🆔', highlight: true },
               { label: 'DID URI', value: tx.URI ? prettyJson(Buffer.from(tx.URI, 'hex').toString('utf8')) : 'N/A', icon: '🆔', highlight: true },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// 12. DidDeletePreviewFormatter Preview Formatter
class DidDeletePreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Delete DID',
               description: 'Successfully deleted this DID',
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any): KeyDetail[] {
          const details: KeyDetail[] = [
               {
                    label: 'Fee',
                    value: formatXRPAmount(tx.Fee || '12'),
                    icon: '⛽',
               },
          ];

          return details;
     }

     getRequiredFields(tx: any) {
          return [];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// Generic Preview Formatter
// Example fix for any formatter that might return undefined
class GenericPreviewFormatter implements TransactionPreviewFormatter {
     constructor(private readonly txType: string) {}

     getSummary(tx: any, accountInfo?: any) {
          return {
               title: `${this.txType} Transaction`,
               description: `Prepare to submit ${this.txType} transaction`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const excludeFields = new Set(['Account', 'SigningPubKey', 'TxnSignature', 'hash', 'Fee']);
          const details = Object.entries(tx)
               .filter(([key]) => !excludeFields.has(key))
               .map(([key, value]) => ({
                    label: key,
                    value: this.formatValue(value),
                    icon: this.getIconForField(key),
                    highlight: false,
               }));

          // Always return at least some details
          if (details.length === 0) {
               return [
                    {
                         label: 'Transaction Type',
                         value: this.txType,
                         icon: '📄',
                         highlight: false,
                    },
               ];
          }

          return details;
     }

     getRequiredFields(tx: any) {
          return []; // Return empty array, not undefined
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];
          const fee = Number.parseInt(tx.Fee || '12');
          if (fee > 5000) {
               warnings.push(`⚠️ High transaction fee: ${formatXRPAmount(fee)}`);
          }
          return warnings;
     }

     private formatValue(value: any): string {
          if (value === undefined || value === null) return '—';
          if (typeof value === 'string' && value.length > 30) {
               return value.slice(0, 27) + '...';
          }
          if (typeof value === 'object') {
               return JSON.stringify(value).slice(0, 50);
          }
          return String(value);
     }

     private getIconForField(field: string): string {
          const icons: Record<string, string> = {
               Amount: '💰',
               Destination: '🎯',
               Sequence: '🔢',
               Flags: '🚩',
               LastLedgerSequence: '📒',
               NFTokenID: '🖼️',
               DomainID: '🆔',
          };
          return icons[field] || '📄';
     }
}

// Also add Escrow formatters (simplified versions for preview)
class EscrowCreatePreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Create Escrow',
               description: `Lock ${formatXRPAmount(tx.Amount)} in escrow`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [
               { label: 'Amount', value: formatXRPAmount(tx.Amount), icon: '💰', highlight: true },
               { label: 'Destination', value: shortenAddress(tx.Destination), icon: '🎯' },
          ];

          if (tx.CancelAfter) {
               details.push({ label: 'Cancel After', value: formatDatePreview(tx.CancelAfter), icon: '❌' });
          }
          if (tx.FinishAfter) {
               details.push({ label: 'Release After', value: formatDatePreview(tx.FinishAfter), icon: '✅' });
          }
          if (tx.Condition) {
               details.push({ label: 'Condition', value: shortenAddress(tx.Condition), icon: '🔒' });
          }

          details.push({ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' });

          return details;
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Amount',
                    value: tx.Amount,
                    isValid: !!tx.Amount && Number.parseInt(tx.Amount) > 0,
                    message: tx.Amount ? (Number.parseInt(tx.Amount) <= 0 ? 'Amount must be greater than 0' : undefined) : 'Amount is required',
               },
               {
                    label: 'Destination',
                    value: tx.Destination,
                    isValid: !!tx.Destination,
                    message: tx.Destination ? undefined : 'Destination is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];
          const amount = Number.parseInt(tx.Amount || '0');

          if (accountInfo?.Balance) {
               const balance = Number.parseInt(accountInfo.Balance);
               if (amount + 100 > balance) {
                    warnings.push(`⚠️ Insufficient balance for escrow + reserve`);
               }
          }

          if (!tx.CancelAfter && !tx.FinishAfter && !tx.Condition) {
               warnings.push(`⚠️ No release or cancel conditions set. Escrow cannot be released.`);
          }

          return warnings;
     }
}

class EscrowFinishPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Finish Escrow',
               description: `Release funds from escrow`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'Owner', value: shortenAddress(tx.Owner), icon: '👤' },
               { label: 'Offer Sequence', value: tx.OfferSequence, icon: '🔢', highlight: true },
               { label: 'Condition', value: tx.Condition ? shortenAddress(tx.Condition) : 'None', icon: '🔓' },
               { label: 'Fulfillment', value: tx.Fulfillment ? shortenAddress(tx.Fulfillment) : 'None', icon: '✅' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Owner',
                    value: tx.Owner,
                    isValid: !!tx.Owner,
                    message: tx.Owner ? undefined : 'Owner address is required',
               },
               {
                    label: 'Offer Sequence',
                    value: tx.OfferSequence,
                    isValid: !!tx.OfferSequence,
                    message: tx.OfferSequence ? undefined : 'Offer sequence is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];

          if (tx.Condition && !tx.Fulfillment) {
               warnings.push(`⚠️ Condition requires fulfillment to release escrow`);
          }

          return warnings;
     }
}

class EscrowCancelPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Cancel Escrow',
               description: `Cancel escrow and return funds to owner`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'Owner', value: shortenAddress(tx.Owner), icon: '👤' },
               { label: 'Offer Sequence', value: tx.OfferSequence, icon: '🔢', highlight: true },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Owner',
                    value: tx.Owner,
                    isValid: !!tx.Owner,
                    message: tx.Owner ? undefined : 'Owner address is required',
               },
               {
                    label: 'Offer Sequence',
                    value: tx.OfferSequence,
                    isValid: !!tx.OfferSequence,
                    message: tx.OfferSequence ? undefined : 'Offer sequence is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// Similar simplified versions for other payment channel formatters...
class PaymentChannelCreatePreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Create Payment Channel',
               description: `Create channel to ${shortenAddress(tx.Destination)} with ${formatXRPAmount(tx.Amount)}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'Amount', value: formatXRPAmount(tx.Amount), icon: '💰', highlight: true },
               { label: 'Destination', value: shortenAddress(tx.Destination), icon: '🎯' },
               { label: 'Settle Delay', value: `${tx.SettleDelay} seconds`, icon: '⏱️' },
               { label: 'Cancel After', value: tx.CancelAfter ? formatDatePreview(tx.CancelAfter) : 'Never', icon: '❌' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Amount',
                    value: tx.Amount,
                    isValid: !!tx.Amount,
                    message: tx.Amount ? undefined : 'Amount is required',
               },
               {
                    label: 'Destination',
                    value: tx.Destination,
                    isValid: !!tx.Destination,
                    message: tx.Destination ? undefined : 'Destination is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

class PaymentChannelClaimPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const isClose = tx.Flags === 1;
          return {
               title: isClose ? 'Close Payment Channel' : 'Claim from Payment Channel',
               description: isClose ? 'Close the payment channel' : 'Claim funds from payment channel',
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [{ label: 'Channel ID', value: shortenAddress(tx.Channel), icon: '📡', highlight: true }];

          if (tx.Balance) {
               details.push({
                    label: 'Balance',
                    value: formatXRPAmount(tx.Balance),
                    icon: '💰',
                    highlight: false,
               });
          }
          if (tx.Amount) {
               details.push({
                    label: 'Amount',
                    value: formatXRPAmount(tx.Amount),
                    icon: '💵',
                    highlight: false,
               });
          }

          details.push({
               label: 'Fee',
               value: formatXRPAmount(tx.Fee || '12'),
               icon: '⛽',
               highlight: false,
          });

          return details;
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Channel ID',
                    value: tx.Channel,
                    isValid: !!tx.Channel,
                    message: tx.Channel ? undefined : 'Channel ID is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

class PaymentChannelFundPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Fund Payment Channel',
               description: `Add ${formatXRPAmount(tx.Amount)} to payment channel`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'Channel ID', value: shortenAddress(tx.Channel), icon: '📡', highlight: true },
               { label: 'Amount to Add', value: formatXRPAmount(tx.Amount), icon: '💰', highlight: true },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Channel ID',
                    value: tx.Channel,
                    isValid: !!tx.Channel,
                    message: tx.Channel ? undefined : 'Channel ID is required',
               },
               {
                    label: 'Amount',
                    value: tx.Amount,
                    isValid: !!tx.Amount,
                    message: tx.Amount ? undefined : 'Amount is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

class SignerListSetPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const signerCount = tx.SignerEntries?.length || 0;
          const isRemoval = signerCount === 0;

          return {
               title: isRemoval ? 'Remove Signer List' : 'Set Up Multi-Signing',
               description: isRemoval ? 'Remove multi-signing configuration' : `Configure ${signerCount} signer${signerCount === 1 ? '' : 's'} with quorum ${tx.SignerQuorum}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [{ label: 'Quorum', value: tx.SignerQuorum, icon: '📊', highlight: true }];

          if (tx.SignerEntries && tx.SignerEntries.length > 0) {
               details.push({
                    label: 'Signers',
                    value: tx.SignerEntries.map((s: any) => {
                         const weight = s.SignerEntry.WalletLocator?.Weight || s.SignerEntry.SignerWeight;
                         const address = shortenAddress(s.SignerEntry.Account);
                         return `${address} (weight: ${weight})`;
                    }).join('\n'),
                    icon: '✍️',
                    highlight: false,
               });
          }

          details.push({
               label: 'Fee',
               value: formatXRPAmount(tx.Fee || '12'),
               icon: '⛽',
               highlight: false,
          });

          return details;
     }

     getRequiredFields(tx: any) {
          const required = [];

          if (tx.SignerEntries && tx.SignerEntries.length > 0) {
               required.push({
                    label: 'Quorum',
                    value: tx.SignerQuorum,
                    isValid:
                         tx.SignerQuorum > 0 &&
                         tx.SignerQuorum <=
                              tx.SignerEntries.reduce((sum: number, s: any) => {
                                   return sum + (s.SignerEntry.WalletLocator?.Weight || s.SignerEntry.SignerWeight || 0);
                              }, 0),
                    message: tx.SignerQuorum ? (tx.SignerQuorum > tx.SignerEntries.reduce((sum: any, s: { SignerEntry: { WalletLocator: { Weight: any }; SignerWeight: any } }) => sum + (s.SignerEntry.WalletLocator?.Weight || s.SignerEntry.SignerWeight || 0), 0) ? 'Quorum cannot exceed total signer weights' : undefined) : 'Quorum is required',
                    highlight: false,
               });
          }

          return required;
     }

     getWarnings(tx: any, accountInfo?: any) {
          const warnings = [];

          if (tx.SignerEntries && tx.SignerEntries.length > 0) {
               const totalWeight = tx.SignerEntries.reduce((sum: number, s: any) => {
                    return sum + (s.SignerEntry.WalletLocator?.Weight || s.SignerEntry.SignerWeight || 0);
               }, 0);

               if (tx.SignerQuorum === totalWeight) {
                    warnings.push(`ℹ️ All signers must sign for this quorum (${tx.SignerQuorum}/${totalWeight})`);
               } else if (tx.SignerQuorum < totalWeight / 2) {
                    warnings.push(`⚠️ Low quorum (${tx.SignerQuorum}/${totalWeight}) - fewer signatures required for control`);
               }
          }

          return warnings;
     }
}

class NFTokenBurnPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          return {
               title: 'Burn NFT',
               description: `Permanently destroy NFT ${shortenAddress(tx.NFTokenID)}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          return [
               { label: 'NFT ID', value: shortenAddress(tx.NFTokenID), icon: '🖼️', highlight: true },
               { label: 'Owner', value: shortenAddress(tx.Account), icon: '👤' },
               { label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' },
          ];
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'NFT ID',
                    value: tx.NFTokenID,
                    isValid: !!tx.NFTokenID,
                    message: tx.NFTokenID ? undefined : 'NFT ID is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return ['⚠️ This action is permanent and cannot be undone. The NFT will be destroyed forever.'];
     }
}

class NFTokenAcceptOfferPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const hasSellOffer = !!tx.SellOffer;
          const hasBuyOffer = !!tx.BuyOffer;

          let description = '';
          if (hasSellOffer && hasBuyOffer) {
               description = 'Accept both buy and sell offers';
          } else if (hasSellOffer) {
               description = 'Accept sell offer';
          } else {
               description = 'Accept buy offer';
          }

          return {
               title: 'Accept NFT Offer',
               description: description,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [];

          if (tx.SellOffer) {
               details.push({ label: 'Sell Offer ID', value: shortenAddress(tx.SellOffer), icon: '💰' });
          }
          if (tx.BuyOffer) {
               details.push({ label: 'Buy Offer ID', value: shortenAddress(tx.BuyOffer), icon: '💵' });
          }
          if (tx.NFTokenID) {
               details.push({ label: 'NFT ID', value: shortenAddress(tx.NFTokenID), icon: '🖼️' });
          }

          details.push({ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' });

          return details;
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'Offer ID',
                    value: tx.SellOffer || tx.BuyOffer,
                    isValid: !!(tx.SellOffer || tx.BuyOffer),
                    message: tx.SellOffer || tx.BuyOffer ? undefined : 'At least one offer ID is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

class NFTokenCancelOfferPreviewFormatter implements TransactionPreviewFormatter {
     getSummary(tx: any, accountInfo?: any) {
          const offerCount = tx.NFTokenOffers?.length || 0;
          return {
               title: 'Cancel NFT Offers',
               description: `Cancel ${offerCount} NFT offer${offerCount === 1 ? '' : 's'}`,
               estimatedFee: formatXRPAmount(tx.Fee || '12'),
          };
     }

     getKeyDetails(tx: any, accountInfo?: any) {
          const details = [];

          if (tx.NFTokenOffers && tx.NFTokenOffers.length > 0) {
               details.push({
                    label: 'Offers to Cancel',
                    value: tx.NFTokenOffers.map((offer: string) => shortenAddress(offer)).join(', '),
                    icon: '🗑️',
               });
          }

          details.push({ label: 'Fee', value: formatXRPAmount(tx.Fee || '12'), icon: '⛽' });

          return details;
     }

     getRequiredFields(tx: any) {
          return [
               {
                    label: 'NFT Offer IDs',
                    value: tx.NFTokenOffers?.length,
                    isValid: tx.NFTokenOffers && tx.NFTokenOffers.length > 0,
                    message: tx.NFTokenOffers?.length ? undefined : 'At least one offer ID is required',
               },
          ];
     }

     getWarnings(tx: any, accountInfo?: any) {
          return [];
     }
}

// Helper functions
function formatXRPAmount(drops: string | number): string {
     const amount = typeof drops === 'string' ? Number.parseInt(drops) : drops;
     return `${(amount / 1000000).toFixed(6)} XRP`;
}

function formatCurrencyAmountPreview(amount: any): string {
     if (!amount) return '0 XRP';
     if (typeof amount === 'string') {
          return formatXRPAmount(amount);
     }
     if (amount.currency && amount.issuer) {
          const value = Number.parseInt(amount.value).toFixed(6);
          return `${value} ${amount.currency}`;
     }
     return String(amount);
}

function shortenAddress(address: string): string {
     if (!address || address.length < 10) return address || 'Unknown';
     return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDatePreview(timestamp: number): string {
     if (!timestamp) return 'Not set';
     return new Date(timestamp * 1000).toLocaleString();
}

function prettyJson(value: string | undefined): string {
     if (!value || value === 'N/A') return 'N/A';

     try {
          // Safely parse the JSON string that came from the ledger
          const parsed = JSON.parse(value);
          // Pretty-print with 2-space indentation
          return JSON.stringify(parsed, null, 2);
     } catch {
          // Fallback: if it's not valid JSON (should never happen), show raw
          return value;
     }
}
