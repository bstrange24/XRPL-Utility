import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-sign-transaction-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './sign-transaction-requirements-info.component.html',
     styleUrl: './sign-transaction-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignTransactionRequirementsInfoComponent {}
