import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-send-xrp-requirements-info',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './send-xrp-requirements-info.component.html',
     styleUrl: './send-xrp-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpRequirementsInfoComponent {
     activeTab = input.required<'sendXrp'>();

     // Collapsible state
     isExpanded = signal(false);
}
