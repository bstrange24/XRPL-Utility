import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ToastService } from '../../../../services/utils/toast/toast.service';

@Component({
     selector: 'app-summary',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './summary.component.html',
     styleUrl: './summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly toastService = inject(ToastService);

     @Input() trustlinesToShow: any[] = [];
     @Input() info: any = null;
     @Input() isExpanded: boolean = false;
     @Input() explorerUrl: string = '';

     @Output() toggle = new EventEmitter<void>();

     toggleExpanded(): void {
          this.toggle.emit();
     }

     copyIssuer(address: string): void {
          this.copyUtilService.copyAndToast(address, 'Issuer Address');
     }
}
