import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-checks-requirement-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './checks-requirement-info.component.html',
     styleUrl: './checks-requirement-info.component.css',
     animations: [trigger('expandCollapse', [transition(':enter', [style({ height: 0, opacity: 0, overflow: 'hidden' }), animate('300ms ease-out', style({ height: '*', opacity: 1 }))]), transition(':leave', [animate('250ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))])])],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksRequirementInfoComponent {
     activeTab = input.required<'createCheck'>();

     // Collapsible state
     isExpanded = signal(false);
}
