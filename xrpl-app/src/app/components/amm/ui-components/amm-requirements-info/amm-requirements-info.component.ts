import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-amm-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './amm-requirements-info.component.html',
     styleUrl: './amm-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmmRequirementsInfoComponent {}
