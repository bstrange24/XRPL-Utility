import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { AccountChangesViewModelService } from '../../../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';

@Component({
     selector: 'app-account-changes-summary',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, NgIcon],
     templateUrl: './account-changes-summary.component.html',
     styleUrl: './account-changes-summary.component.css',
})
export class AccountChangesSummaryComponent {
     public readonly viewModel = inject(AccountChangesViewModelService);
}
