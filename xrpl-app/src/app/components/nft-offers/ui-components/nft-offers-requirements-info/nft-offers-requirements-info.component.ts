import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-nft-offers-requirements-info',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './nft-offers-requirements-info.component.html',
     styleUrl: './nft-offers-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftOffersRequirementsInfoComponent {
     activeTab = input.required<'buyNft'>();

     // Collapsible state
     isExpanded = signal(false);
}
