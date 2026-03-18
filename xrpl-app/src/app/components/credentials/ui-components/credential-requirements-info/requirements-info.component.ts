import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CredentialActionTypes } from '../../constants/credential.types';

@Component({
     selector: 'app-requirements-info',
     imports: [NgIcon],
     templateUrl: './requirements-info.component.html',
     styleUrl: './requirements-info.component.css',
})
export class RequirementsInfoComponent {
     activeTab = input.required<CredentialActionTypes>();
}
