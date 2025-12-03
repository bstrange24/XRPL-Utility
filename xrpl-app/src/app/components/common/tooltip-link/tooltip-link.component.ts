import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
     selector: 'app-tooltip-link',
     imports: [],
     templateUrl: './tooltip-link.component.html',
     styleUrl: './tooltip-link.component.css',
     encapsulation: ViewEncapsulation.None,
})
export class TooltipLinkComponent {
     @Input() href = '';
     @Input() tooltipText = 'Open in Explorer';
}
