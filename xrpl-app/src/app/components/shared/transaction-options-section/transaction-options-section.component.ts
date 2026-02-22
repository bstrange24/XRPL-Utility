import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';

@Component({
     selector: 'app-transaction-options-section',
     standalone: true,
     imports: [CommonModule, FormsModule],
     templateUrl: './transaction-options-section.component.html',
     styleUrl: './transaction-options-section.component.css',
})
export class TransactionOptionsSectionComponent {
     public readonly txUiService = inject(TransactionUiService);
}
