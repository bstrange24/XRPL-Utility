import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { EscrowBaseComponent } from '../escrow-base/escrow-base.component';
import { WarningMessageComponent } from '../../shared/ui-components/warning-message/warning-message.component';
import { TabMenuWithInfoComponent } from '../../shared/ui-components/tab-with-menu/tab-with-info.component';
import { ExecutionTimeDisplayComponent } from '../../shared/ui-components/execution-time/execution-time.component';
import { TransactionPreviewComponent } from '../../shared/transaction-preview/transaction-preview.component';
import * as cc from 'five-bells-condition';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionOptionsComponent } from '../../shared/transaction-options/transaction-options.component';
import { EscrowsCancelComponent } from '../tab/escrows-cancel/escrows-cancel.component';
import { EscrowsCreateComponent } from '../tab/escrows-create/escrows-create.component';
import { EscrowsFinishComponent } from '../tab/escrows-finish/escrows-finish.component';
import { EscrowSummaryComponent } from '../ui-components/escrow-summary/escrow-summary.component';

@Component({
     selector: 'app-conditional-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, MatSlideToggleModule, TransactionOptionsComponent, EscrowsCreateComponent, EscrowsCancelComponent, EscrowsFinishComponent],
     templateUrl: './conditional-escrow.component.html',
     styleUrl: './conditional-escrow.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConditionalEscrowComponent extends EscrowBaseComponent {
     override readonly isConditional = true;

     // Signals + setters for two-way binding with Condition / Fulfillment fields
     readonly conditionSignal = signal<string>('');
     readonly fulfillmentSignal = signal<string>('');

     setCondition(value: string): void {
          this.conditionSignal.set(value);
          this.escrowStoreService.setField('condition', value);
     }

     setFulfillment(value: string): void {
          this.fulfillmentSignal.set(value);
          this.escrowStoreService.setField('fulfillment', value);
     }

     // Keep your existing "Generate Condition" button logic (if you had a method)
     getCondition() {
          const { condition, fulfillment } = this.generateCondition();
          this.escrowStoreService.setField('condition', condition);
          this.escrowStoreService.setField('fulfillment', fulfillment);
     }

     generateCondition(): { condition: string; fulfillment: string } {
          console.log('Generating a cryptographic condition and fulfillment for XRPL escrow');

          // Use Web Crypto API to generate 32 random bytes
          const preimage = new Uint8Array(32);
          globalThis.crypto.getRandomValues(preimage); // Browser-compatible random bytes

          // Create a PREIMAGE-SHA-256 condition
          const fulfillment = new cc.PreimageSha256();
          fulfillment.setPreimage(Buffer.from(preimage)); // Convert Uint8Array to Buffer

          // Get the condition (hash of the preimage) in hexadecimal
          const condition = fulfillment.getConditionBinary().toString('hex').toUpperCase();

          // Get the fulfillment (preimage) in hexadecimal, to be kept secret
          const fulfillment_hex = fulfillment.serializeBinary().toString('hex').toUpperCase();

          console.log('Condition:', condition);
          console.log('Fulfillment (keep secret until ready to finish escrow):', fulfillment_hex);

          return { condition, fulfillment: fulfillment_hex };
     }

     protected override clearInputFields(): void {
          this.conditionSignal.set('');
          this.fulfillmentSignal.set('');
          this.escrowStoreService.setField('condition', '');
          this.escrowStoreService.setField('fulfillment', '');
     }
}
