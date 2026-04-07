import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-summary',
  imports: [],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryComponent {

}
