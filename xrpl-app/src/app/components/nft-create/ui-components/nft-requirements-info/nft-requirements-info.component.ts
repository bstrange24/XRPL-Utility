import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-nft-requirements-info',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './nft-requirements-info.component.html',
     styleUrl: './nft-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftRequirementsInfoComponent {
     activeTab = input.required<'createNft'>();

     // Collapsible state
     isExpanded = signal(false);
}
