import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-wallet-generator-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './wallet-generator-requirements-info.component.html',
     styleUrl: './wallet-generator-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletGeneratorRequirementsInfoComponent {}
