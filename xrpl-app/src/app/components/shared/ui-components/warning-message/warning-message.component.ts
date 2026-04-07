import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-warning-message',
     imports: [NgIcon],
     templateUrl: './warning-message.component.html',
     styleUrl: './warning-message.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarningMessageComponent {
     @Input() warningMessage: string = '';
}
