import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-offer-requirements-info',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './offer-requirements-info.component.html',
     styleUrl: './offer-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferRequirementsInfoComponent {
     activeTab = input.required<'createOffer'>();

     // Collapsible state
     isExpanded = signal(false);
}
