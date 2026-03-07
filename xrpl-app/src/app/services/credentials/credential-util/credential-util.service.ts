import { Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';

export type CredentialTxType = 'createCredential' | 'deleteCredentials';

@Injectable({
     providedIn: 'root',
})
export class CredentialUtilService extends PerformanceBaseComponent {
     constructor(
          public readonly txUiService: TransactionUiService,
          public readonly utilsService: UtilsService,
          private readonly toastService: ToastService
     ) {
          super();
     }

     buildSuccessMessage(type: CredentialTxType, formValues: any, extra: any): string {
          if (type === 'createCredential') {
                    return `Successfully Create Credential`;
          }
          // if (type === 'modifyRegularKey') {
          //      if (extra?.enableRegularKeyFlag === 'Y') {
          //           return `Successfully Set Regular Key ${formValues.regularKeyAddress}`;
          //      } else {
          //           return `Successfully Remove Regular Key ${formValues.regularKeyAddress ? formValues.regularKeyAddress : ''}`;
          //      }
          // }
          // if (type === 'updateMetaData') {
          //      return `Successfully Updated Account Meta Data`;
          // }

          return `Successfully Cancelled Time Based Escrow ${formValues.escrowSequenceNumberField}`;
     }

     handleSimulationSuccess(type: CredentialTxType, formValues: any, hash?: string, extra?: any) {
          let msg: string;

          // if (type === 'createCredential') {
          msg = `Simulated Credential create`;
          // }
          // else if (type === 'modifyRegularKey') {
          //      if (extra?.enableRegularKeyFlag === 'Y') {
          //           msg = `Simulated Setting Regular Key ${formValues.regularKeyAddress}`;
          //      } else {
          //           msg = `Simulated Removing Regular Key ${formValues.regularKeyAddress ? formValues.regularKeyAddress : ''}`;
          //      }
          // } else {
          //      msg = `Simulated Updating Account Meta Data`;
          // }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
