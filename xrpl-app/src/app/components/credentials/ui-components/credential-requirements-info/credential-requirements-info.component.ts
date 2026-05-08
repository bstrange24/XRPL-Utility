import { ChangeDetectionStrategy, Component, input, Signal, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CredentialActionTypes } from '../../constants/credential.types';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-credential-requirements-info',
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './credential-requirements-info.component.html',
     styleUrl: './credential-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialRequirementsInfoComponent {
     activeTab = input.required<Signal<CredentialActionTypes>>();

     // Collapsible state
     isExpanded = signal(false);
}
