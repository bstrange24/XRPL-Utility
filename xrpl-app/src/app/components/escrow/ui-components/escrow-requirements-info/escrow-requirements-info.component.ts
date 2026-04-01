import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-escrow-requirements-info',
     imports: [NgIcon],
     templateUrl: './escrow-requirements-info.component.html',
     styleUrl: './escrow-requirements-info.component.css',
})
export class EscrowRequirementsInfoComponent {
     page = input.required<boolean>();
}
