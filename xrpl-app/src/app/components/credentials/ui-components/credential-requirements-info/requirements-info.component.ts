import { ChangeDetectionStrategy, Component, input, Signal, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CredentialActionTypes } from '../../constants/credential.types';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-requirements-info',
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './requirements-info.component.html',
     styleUrl: './requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementsInfoComponent {
     activeTab = input.required<Signal<CredentialActionTypes>>();

     // Collapsible state
     isExpanded = signal(false);
}
