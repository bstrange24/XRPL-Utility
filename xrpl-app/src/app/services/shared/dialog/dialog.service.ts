import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../components/shared/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class DialogService {
     constructor(private dialog: MatDialog) {}

     async confirm(message: string, title: string = 'Confirm Action'): Promise<boolean> {
          const dialogRef = this.dialog.open(ConfirmDialogComponent, {
               width: '400px',
               data: { title, message },
          });

          return firstValueFrom(dialogRef.afterClosed());
     }
}
