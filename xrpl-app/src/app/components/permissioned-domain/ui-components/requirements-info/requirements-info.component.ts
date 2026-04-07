import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-requirements-info',
     imports: [NgIcon],
     templateUrl: './requirements-info.component.html',
     styleUrl: './requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementsInfoComponent {
     activeTab = input.required<'setPermissionedDomain' | 'deletePermissionedDomain'>();
}
