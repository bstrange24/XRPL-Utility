import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-account-delete-requirements-info',
     imports: [NgIcon],
     templateUrl: './account-delete-requirements-info.component.html',
     styleUrl: './account-delete-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteRequirementsInfoComponent {}
