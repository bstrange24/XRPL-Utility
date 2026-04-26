import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, input, Signal, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-requirements-info',
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './requirements-info.component.html',
     styleUrl: './requirements-info.component.css',
     animations: [trigger('expandCollapse', [transition(':enter', [style({ height: 0, opacity: 0, overflow: 'hidden' }), animate('300ms ease-out', style({ height: '*', opacity: 1 }))]), transition(':leave', [animate('250ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))])])],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementsInfoComponent {
     activeTab = input.required<Signal<'setPermissionedDomain' | 'deletePermissionedDomain'>>();

     // Collapsible state
     isExpanded = signal(false);
}
