import { Component, Input } from '@angular/core';
import { PerformanceBaseComponent } from '../../../performance-base/performance-base.component';

@Component({
     selector: 'app-execution-time-display',
     imports: [],
     templateUrl: './execution-time.component.html',
     styleUrl: './execution-time.component.css',
})
export class ExecutionTimeDisplayComponent extends PerformanceBaseComponent {
     @Input() time: string = '';
}
