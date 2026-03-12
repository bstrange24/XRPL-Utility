import { computed, Injectable, signal } from '@angular/core';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { DidStoreService } from '../did-store/did-store.service';
import didSchema from '../../../components/did/did-schema.json';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../util-service/utils.service';
import { JsonEditorComponent } from '../../../components/json-editor/json-editor.component';

export type DidTab = 'set' | 'delete';

export interface DidInfoData {
     walletName: string;
     mode: DidTab;
     didCount: number;
     existingDid: any[];
}

@Injectable({ providedIn: 'root' })
export class DidViewModelService {
     activeTab = signal<DidTab>('set');
     private didDataEditor = signal<JsonEditorComponent | null>(null);

     constructor(
          private didStore: DidStoreService,
          private walletManager: WalletManagerService,
          private utilsService: UtilsService
     ) {}

     // Current wallet
     currentWallet = computed(() => this.walletManager.walletVm());

     // Info data for template
     infoData = computed<DidInfoData | null>(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const dids = this.didStore.get('existingDid');
          return {
               walletName: wallet.name || 'Selected wallet',
               mode: this.activeTab(),
               didCount: dids.length,
               existingDid: dids,
          };
     });

     // Button labels and classes
     actionButtonLabel = computed(() => {
          switch (this.activeTab()) {
               case 'set':
                    return 'Set DID';
               case 'delete':
                    return 'Delete DID';
          }
     });

     actionButtonClass = computed(() => {
          switch (this.activeTab()) {
               case 'set':
                    return 'btn-primary-blue';
               case 'delete':
                    return 'btn-primary-red';
          }
     });

     // Byte length computations
     didDataByteLength = computed(() => {
          const meta = this.didStore.get('didData').trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               console.log('DID JSON -> Hex length:', hex.length, '→ Bytes:', hex.length / 2);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert DID JSON to hex:', e);
               return 0;
          }
     });

     uriDataByteLength = computed(() => {
          const meta = this.didStore.get('uriData').trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               console.log('URI JSON -> Hex length:', hex.length, '→ Bytes:', hex.length / 2);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert URI JSON to hex:', e);
               return 0;
          }
     });

     didDocumentDataByteLength = computed(() => {
          const meta = this.didStore.get('didDocumentData').trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               console.log('DID Document JSON -> Hex length:', hex.length, '→ Bytes:', hex.length / 2);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert DID Document JSON to hex:', e);
               return 0;
          }
     });

     // Validation flags
     didDataIsValid = computed(() => {
          return this.didDataByteLength() <= 256;
     });

     uriDataIsValid = computed(() => {
          return this.uriDataByteLength() <= 256;
     });

     didDocumentDataIsValid = computed(() => {
          return this.didDocumentDataByteLength() <= 256;
     });

     hasJsonSyntaxError = computed(() => {
          const editor = this.didDataEditor();
          const error = editor?.jsonError()?.trim();
          return !!error;
     });

     validDidSchema = computed(() => {
          const didData = this.didStore.get('didData');
          if (!didData.trim() || this.hasJsonSyntaxError()) return false;

          const result = this.utilsService.validateAndConvertDidJson(didData, didSchema);
          return result.success;
     });

     allFieldsValid = computed(() => {
          return this.didDocumentDataIsValid() && this.uriDataIsValid() && this.didDataIsValid() && !this.hasJsonSyntaxError() && this.validDidSchema();
     });

     setDidDataEditor(editor: JsonEditorComponent) {
          this.didDataEditor.set(editor);
     }
}
