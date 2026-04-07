import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-nft-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './nft-requirements-info.component.html',
     styleUrl: './nft-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftRequirementsInfoComponent {}
