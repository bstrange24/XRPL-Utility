import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EscrowBaseComponent } from '../escrow-base/escrow-base.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { NavbarComponent } from '../../navbar/navbar.component';
import { TransactionOptionsComponent } from '../../shared/transaction-options/transaction-options.component';
import { ExecutionTimeDisplayComponent } from '../../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../../shared/ui-components/warning-message/warning-message/warning-message.component';
import { TransactionPreviewComponent } from '../../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../../wallet-panel/wallet-panel.component';
import { EscrowRequirementsInfoComponent } from '../ui-components/escrow-requirements-info/escrow-requirements-info.component';
import { EscrowSummaryComponent } from '../ui-components/escrow-summary/escrow-summary.component';
import { EscrowsCreateComponent } from '../tab/escrows-create/escrows-create.component';
import { EscrowsCancelComponent } from '../tab/escrows-cancel/escrows-cancel.component';
import { EscrowsFinishComponent } from '../tab/escrows-finish/escrows-finish.component';

@Component({
     selector: 'app-time-based-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, EscrowRequirementsInfoComponent, MatSlideToggleModule, TransactionOptionsComponent, EscrowSummaryComponent, EscrowsCreateComponent, EscrowsCancelComponent, EscrowsFinishComponent],
     templateUrl: './time-based-escrow.component.html',
     styleUrl: './time-based-escrow.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeBasedEscrowComponent extends EscrowBaseComponent {
     override readonly isConditional = false;

     protected override clearInputFields(): void {
          // Time-based page has no extra fields to clear
     }
}
