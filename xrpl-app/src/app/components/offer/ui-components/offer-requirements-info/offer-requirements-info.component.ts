import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-offer-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './offer-requirements-info.component.html',
     styleUrl: './offer-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferRequirementsInfoComponent {}
