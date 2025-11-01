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
};
