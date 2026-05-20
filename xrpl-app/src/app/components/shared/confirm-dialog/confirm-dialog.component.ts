import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-confirm-dialog',
     standalone: true,
     imports: [CommonModule, MatDialogModule, MatButtonModule, NgIcon, LucideAngularModule],
     templateUrl: './confirm-dialog.component.html',
     styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
     constructor(
          public dialogRef: MatDialogRef<ConfirmDialogComponent>,
          @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
     ) {}

     onConfirm(): void {
          this.dialogRef.close(true);
     }

     onCancel(): void {
          this.dialogRef.close(false);
     }
}
