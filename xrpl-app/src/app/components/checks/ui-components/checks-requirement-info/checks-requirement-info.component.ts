import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-checks-requirement-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './checks-requirement-info.component.html',
     styleUrl: './checks-requirement-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksRequirementInfoComponent {}
