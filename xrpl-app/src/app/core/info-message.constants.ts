import { ECDSA } from 'xrpl';
import * as xrpl from 'xrpl';
import { TrustSetFlags } from 'xrpl';

export const InfoMessageConstants = {
     SEND_XRP_INFORMATION: `
                    <strong>Sending XRP (Payment Transaction)</strong>
                    <ul>
                    <li><strong>Amount</strong> — How much XRP to send.</li>
                    <li><strong>Destination</strong> — The recipient address (classic or X-address).</li>
                    <li><strong>DestinationTag (optional)</strong> — Used by custodial/exchange accounts to credit the correct sub-account. Omitting this where required can cause lost funds.</li>
                    <li><strong>SourceTag (optional)</strong> — Identifies the sender’s sub-account (useful for exchanges or platforms sending from shared wallets).</li>
                    <li><strong>InvoiceID (optional)</strong> — A 256-bit (64-character hex) unique ID that can be used to match payments to invoices or internal records.</li>
                    <li><strong>Sequence / TicketSequence</strong> — Use your account <code>Sequence</code> or a <code>TicketSequence</code> (from a pre-created Ticket) to allow out-of-order submission.</li>
                    <li><strong>Irreversible</strong> — Once validated in a ledger, XRP payments cannot be reversed.</li>
                    </ul>
                    <em>Tip:</em> Always double-check <strong>Destination</strong> and <strong>DestinationTag</strong> before signing to avoid lost funds.`,
     CREATE_TICKET_INFORMATION: `<strong>Creating Tickets</strong> increases your owner reserves by <strong>1 XRP</strong> per ticket.
                         These Tickets are stored on your account and can later be used in any transaction that supports the
                         <code>TicketSeq</code> field, after which the reserved XRP is released.`,
     DELETE_TICKET_INFORMATION: `<strong>Deleting a ticket releases the 1 XRP reserve</strong> that was locked when the ticket was created.
                    The ticket sequence number you enter will be removed from the account.
                    <br><br>
                    <em>Note: This action is irreversible, but the reserved XRP becomes available again.</em>`,
     CREATE_CHECK_INFORMATION: `
                    <strong>Check Create</strong> — Used by the sender to create a check.

                    <strong>Reserve impact:</strong>
                    <ul>
                    <li>Each Check object increases your owner reserve by <strong>1 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the check is cashed or canceled.</li>
                    </ul>
                    `,
     CASH_CHECK_INFORMATION: `
                    <strong>Cash Checks</strong> — Used by the recipient to claim funds from a check.

                    <strong>Reserve impact:</strong>
                    <ul>
                    <li>Each Check object increases your owner reserve by <strong>1 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the check is cashed or canceled.</li>
                    </ul>
                    `,
     CANCEL_CHECK_INFORMATION: `
                    <strong>Cancel Checks</strong>  — Cancels an outstanding check (only sender or recipient can do this)

                    <strong>Reserve impact:</strong>
                    <ul>
                    <li>Each Check object increases your owner reserve by <strong>1 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the check is cashed or canceled.</li>
                    </ul>
                    `,
     CREATE_PAYMENT_CHANNEL_INFORMATION: `
                    <strong>Quick guide — XRPL Payment Channels</strong>
                    <ul>
                    <li><strong>What are Payment Channels?</strong> — They allow you to send many small, fast off-ledger payments to a recipient. Only the channel setup, funding, and close transactions are recorded on the ledger — the rest use signed claims exchanged off-chain.</li>
                    <li><strong>Use case:</strong> — Streaming or micropayments (e.g. pay-per-second for a service) without paying a network fee for every payment.</li>
                    </ul>

                    <strong>✅ PaymentChannelCreate fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — The sender (who opens the channel).</li>
                    <li><strong>Destination</strong> — The recipient who can claim XRP from the channel.</li>
                    <li><strong>Amount</strong> — Total amount of XRP (in drops) to fund the channel initially.</li>
                    <li><strong>SettleDelay</strong> — The minimum time (in seconds) that must pass after a close request before the channel can be closed and remaining XRP returned.</li>
                    <li><strong>PublicKey</strong> — The sender’s public key (hex), used to verify claims signed off-ledger.</li>
                    <li><strong>CancelAfter (optional)</strong> — Time (in seconds since Ripple Epoch, 2000-01-01) after which the channel expires automatically.</li>
                    <li><strong>DestinationTag (optional)</strong> — Used if the destination requires a tag (e.g., exchange or custodial address).</li>
                    <li><strong>SourceTag (optional)</strong> — Identifies which sub-account on the sender’s side opened the channel.</li>
                    <li><strong>Memos (optional)</strong> — Extra info or metadata.</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Payment Channel object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the channel is closed and removed from the ledger.</li>
                    </ul>

                    <em>Tip:</em> Only the channel creation, funding, and closing are on-ledger. Claims are exchanged off-ledger for speed and zero fees until redeemed. The remaining XRP returns to the sender when the channel closes.
                    `,
     FUND_PAYMENT_CHANNEL_INFORMATION: `
                    <strong>Quick guide — XRPL Payment Channels</strong>
                    <ul>
                    <li><strong>What are Payment Channels?</strong> — They allow you to send many small, fast off-ledger payments to a recipient. Only the channel setup, funding, and close transactions are recorded on the ledger — the rest use signed claims exchanged off-chain.</li>
                    <li><strong>Use case:</strong> — Streaming or micropayments (e.g. pay-per-second for a service) without paying a network fee for every payment.</li>
                    </ul>

                    <strong>✅ PaymentChannelFund fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — The sender adding more XRP to an existing channel.</li>
                    <li><strong>Channel</strong> — The unique channel ID (from the PaymentChannelCreate transaction result).</li>
                    <li><strong>Amount</strong> — Additional XRP (in drops) to add to the channel’s balance.</li>
                    <li><strong>Expiration (optional)</strong> — Extends the expiration time (in seconds since Ripple Epoch).</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Payment Channel object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the channel is closed and removed from the ledger.</li>
                    </ul>

                    <em>Tip:</em> Only the channel creation, funding, and closing are on-ledger. Claims are exchanged off-ledger for speed and zero fees until redeemed. The remaining XRP returns to the sender when the channel closes.
                    `,

     CLAIM_PAYMENT_CHANNEL_INFORMATION: `
                    <strong>Quick guide — XRPL Payment Channels</strong>
                    <ul>
                    <li><strong>What are Payment Channels?</strong> — They allow you to send many small, fast off-ledger payments to a recipient. Only the channel setup, funding, and close transactions are recorded on the ledger — the rest use signed claims exchanged off-chain.</li>
                    <li><strong>Use case:</strong> — Streaming or micropayments (e.g. pay-per-second for a service) without paying a network fee for every payment.</li>
                    </ul>

                    <strong>✅ PaymentChannelClaim fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — Either party can submit a claim (sender or receiver).</li>
                    <li><strong>Channel</strong> — The channel ID.</li>
                    <li><strong>Balance</strong> — Total XRP (in drops) the recipient should receive up to this claim.</li>
                    <li><strong>Amount (optional)</strong> — XRP to actually deliver with this claim (optional when just closing or verifying).</li>
                    <li><strong>Signature (optional)</strong> — Sender’s signature over the claim (used when recipient submits it to get paid).</li>
                    <li><strong>PublicKey (optional)</strong> — Sender’s public key verifying the claim signature.</li>
                    <li><strong>Flags (optional)</strong> — Use <code>tfRenew</code> (0x00010000) to extend expiration.</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Payment Channel object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the channel is closed and removed from the ledger.</li>
                    </ul>

                    <em>Tip:</em> Only the channel creation, funding, and closing are on-ledger. Claims are exchanged off-ledger for speed and zero fees until redeemed. The remaining XRP returns to the sender when the channel closes.
                    `,

     CLOSE_PAYMENT_CHANNEL_INFORMATION: `
                    <strong>Quick guide — XRPL Payment Channels</strong>
                    <ul>
                    <li><strong>What are Payment Channels?</strong> — They allow you to send many small, fast off-ledger payments to a recipient. Only the channel setup, funding, and close transactions are recorded on the ledger — the rest use signed claims exchanged off-chain.</li>
                    <li><strong>Use case:</strong> — Streaming or micropayments (e.g. pay-per-second for a service) without paying a network fee for every payment.</li>
                    </ul>

                    <strong>✅ PaymentChannelClaim fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — Either party can submit a claim (sender or receiver).</li>
                    <li><strong>Channel</strong> — The channel ID.</li>
                    <li><strong>Balance</strong> — Total XRP (in drops) the recipient should receive up to this claim.</li>
                    <li><strong>Amount (optional)</strong> — XRP to actually deliver with this claim (optional when just closing or verifying).</li>
                    <li><strong>Signature (optional)</strong> — Sender’s signature over the claim (used when recipient submits it to get paid).</li>
                    <li><strong>PublicKey (optional)</strong> — Sender’s public key verifying the claim signature.</li>
                    <li><strong>Flags (optional)</strong> — Use <code>tfClose</code> (0x00020000) to close the channel</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Payment Channel object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the channel is closed and removed from the ledger.</li>
                    </ul>

                    <em>Tip:</em> Only the channel creation, funding, and closing are on-ledger. Claims are exchanged off-ledger for speed and zero fees until redeemed. The remaining XRP returns to the sender when the channel closes.
                    `,
};
