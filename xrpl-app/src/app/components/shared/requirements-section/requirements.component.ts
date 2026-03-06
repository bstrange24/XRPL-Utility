import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { CopyUtilService } from '../../../services/copy-util/copy-util.service';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/util-service/utils.service';

@Component({
     selector: 'app-requirements',
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NgIcon],
     templateUrl: './requirements.component.html',
     styleUrl: './requirements.component.css',
})
export class RequirementsComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly copyUtilService = inject(CopyUtilService);

     activeTab = input.required<'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey'>();
}
