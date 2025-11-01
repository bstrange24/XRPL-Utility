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
                         <code>TicketSeq</code> field, after which the reserved XRP is released..`,
     DELETE_TICKET_INFORMATION: `<strong>Deleting a ticket releases the 1 XRP reserve</strong> that was locked when the ticket was created.
                    The ticket sequence number you enter will be removed from the account.
                    <br><br>
                    <em>Note: This action is irreversible, but the reserved XRP becomes available again.</em>`,
     SEND_CHECK_INFORMATION: `
                    <strong>Sending Checks</strong>
                    <ul>
                    <li><strong>CheckCreate</strong> — Used by the sender to create a check.</li>
                    </ul>

                    <strong>✅ CheckCreate fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — The sender creating the check.</li>
                    <li><strong>Destination</strong> — The recipient allowed to cash it.</li>
                    <li><strong>SendMax</strong> — The maximum amount the sender authorizes to send (XRP in drops or issued currency with issuer).</li>
                    <li><strong>DestinationTag (optional)</strong> — Used if the recipient requires a tag (e.g., an exchange sub-account).</li>
                    <li><strong>SourceTag (optional)</strong> — Identifies which sub-account on the sender’s side issued the check.</li>
                    <li><strong>InvoiceID (optional)</strong> — 256-bit (64 hex) unique identifier to match the check to an invoice or record.</li>
                    <li><strong>Expiration (optional)</strong> — Ledger time (in seconds since Ripple Epoch, 2000-01-01) after which the check cannot be cashed.</li>
                    <li><strong>Memos (optional)</strong> — Additional info or metadata.</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Check object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the check is cashed or canceled.</li>
                    </ul>
                    <em>Tip:</em> Checks are great for deferred or conditional payments. The XRP isn’t locked when created, but the sender must have sufficient balance when it’s cashed.
                    `,
     CASH_CHECK_INFORMATION: `
                    <strong>Cashing Checks</strong>
                    <li><strong>CheckCash</strong> — Used by the recipient to claim funds from a check.</li>
                    </ul>

                    <strong>✅ CheckCash fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — The recipient cashing the check.</li>
                    <li><strong>CheckID</strong> — The unique hash of the check being cashed.</li>
                    <li><strong>Amount</strong> — The amount to receive (for partial cashing). Optional if using <code>DeliverMin</code>.</li>
                    <li><strong>DeliverMin (optional)</strong> — The minimum amount to receive if exchange rates or partial liquidity apply (used for IOUs).</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Check object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the check is cashed or canceled.</li>
                    </ul>
                    <em>Tip:</em> Checks are great for deferred or conditional payments. The XRP isn’t locked when created, but the sender must have sufficient balance when it’s cashed.
                    `,
     CANCEL_CHECK_INFORMATION: `
                    <strong>Cancelling Checks</strong>
                    <ul>
                    <li><strong>CheckCancel</strong> — Cancels an outstanding check (only sender or recipient can do this).</li>
                    </ul>

                    <strong>✅ CheckCancel fields:</strong>
                    <ul>
                    <li><strong>Account</strong> — The sender or recipient canceling the check.</li>
                    <li><strong>CheckID</strong> — The hash of the check to cancel.</li>
                    </ul>

                    <strong>💰 Reserve impact:</strong>
                    <ul>
                    <li>Each Check object increases your owner reserve by <strong>2 XRP</strong>.</li>
                    <li>The reserve is <em>released</em> when the check is cashed or canceled.</li>
                    </ul>
                    <em>Tip:</em> Checks are great for deferred or conditional payments. The XRP isn’t locked when created, but the sender must have sufficient balance when it’s cashed.
                    `,
};
