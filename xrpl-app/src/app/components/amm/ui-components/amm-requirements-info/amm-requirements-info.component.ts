import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-amm-requirements-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './amm-requirements-info.component.html',
     styleUrl: './amm-requirements-info.component.css',
     animations: [trigger('expandCollapse', [transition(':enter', [style({ height: 0, opacity: 0, overflow: 'hidden' }), animate('300ms ease-out', style({ height: '*', opacity: 1 }))]), transition(':leave', [animate('250ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))])])],

     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmmRequirementsInfoComponent {
     activeTab = input.required<'createAMM'>();

     // Collapsible state
     isExpanded = signal(false);
}
