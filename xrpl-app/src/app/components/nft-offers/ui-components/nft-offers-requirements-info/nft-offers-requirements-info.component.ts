import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-nft-offers-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './nft-offers-requirements-info.component.html',
     styleUrl: './nft-offers-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftOffersRequirementsInfoComponent {
     activeTab = input.required<'buyNft'>();

     // Collapsible state
     isExpanded = signal(false);
}
