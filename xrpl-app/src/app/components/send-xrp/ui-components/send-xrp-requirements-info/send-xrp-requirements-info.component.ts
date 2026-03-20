import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-send-xrp-requirements-info',
     imports: [NgIcon],
     templateUrl: './send-xrp-requirements-info.component.html',
     styleUrl: './send-xrp-requirements-info.component.css',
})
export class SendXrpRequirementsInfoComponent {
     activeTab = input.required<'sendXrp'>();
}
