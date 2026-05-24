import { computed, inject, Injectable, signal } from '@angular/core';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { DidStoreService } from '../did-store/did-store.service';
import didSchema from '../../../components/did/did-schema.json';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../utils/util-service/utils.service';
import { JsonEditorComponent } from '../../../components/shared/json-editor/json-editor.component';
import { DidInfoData, DidTab } from '../../../components/did/constants/did.types';
import { DidUtilService } from '../did-util/did-util.service';

@Injectable({ providedIn: 'root' })
export class DidViewModelService {
     activeTab = signal<DidTab>('setDid');

     private readonly didDataEditor = signal<JsonEditorComponent | null>(null);
     private readonly didDocumentEditor = signal<JsonEditorComponent | null>(null);
     private readonly uriDataEditor = signal<JsonEditorComponent | null>(null);

     public readonly didStore = inject(DidStoreService);
     public readonly walletManager = inject(WalletManagerService);
     public readonly utilsService = inject(UtilsService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly didStoreService = inject(DidStoreService);

     constructor() {}

     // Current wallet
     currentWallet = computed(() => this.walletManager.walletVm());

     // Info data for template
     infoData = computed<DidInfoData | null>(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const dids = this.didStore.existingDid();
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
               case 'setDid':
                    return 'Set DID';
               case 'deleteDid':
                    return 'Delete DID';
          }
     });

     actionButtonClass = computed(() => {
          switch (this.activeTab()) {
               case 'setDid':
                    return 'btn-primary-blue';
               case 'deleteDid':
                    return 'btn-primary-red';
          }
     });

     // Byte length computations
     didDataByteLength = computed(() => {
          const meta = this.didStore.didData().trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert DID JSON to hex:', e);
               return 0;
          }
     });

     uriDataByteLength = computed(() => {
          const meta = this.didStore.uriData().trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert URI JSON to hex:', e);
               return 0;
          }
     });

     didDocumentDataByteLength = computed(() => {
          const meta = this.didStore.didDocumentData().trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
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

     hasDidDataJsonError = computed(() => {
          const editor = this.didDataEditor();
          if (!editor) return false;
          const error = editor.jsonError();
          return !!error && error.trim().length > 0;
     });

     hasDidDocumentJsonError = computed(() => {
          const editor = this.didDocumentEditor();
          if (!editor) return false;
          const error = editor.jsonError();
          return !!error && error.trim().length > 0;
     });

     hasUriDataJsonError = computed(() => {
          const editor = this.uriDataEditor();
          if (!editor) return false;
          const error = editor.jsonError();
          return !!error && error.trim().length > 0;
     });

     hasJsonSyntaxError = computed(() => {
          return this.hasDidDataJsonError() || this.hasDidDocumentJsonError() || this.hasUriDataJsonError();
     });

     validDidSchema = computed(() => {
          const didData = this.didStore.didData();
          if (!didData.trim() || this.hasDidDataJsonError()) return false;

          const result = this.didUtilService.validateAndConvertDidJson(didData, didSchema);
          return result.success;
     });

     isDidDataValid = computed(() => {
          return this.didDataIsValid() && !this.hasDidDataJsonError() && this.validDidSchema();
     });

     isDidDocumentValid = computed(() => {
          return this.didDocumentDataIsValid() && !this.hasDidDocumentJsonError();
     });

     isUriDataValid = computed(() => {
          return this.uriDataIsValid() && !this.hasUriDataJsonError();
     });

     allFieldsValid = computed(() => {
          const hasDocument = (this.didStoreService.didDocumentData()?.trim() || '').length > 0;
          const hasUri = (this.didStoreService.uriData()?.trim() || '').length > 0;
          const hasData = (this.didStoreService.didData()?.trim() || '').length > 0;

          // All three must have content
          if (!hasDocument || !hasUri || !hasData) return false;

          // Plus your existing validation (size, JSON validity, etc.)
          return !this.hasJsonSyntaxError() && this.didDocumentDataByteLength() <= 256 && this.uriDataByteLength() <= 256 && this.didDataByteLength() <= 256;
     });

     // allFieldsValid = computed(() => {
     //      return this.isDidDataValid() && this.isDidDocumentValid() && this.isUriDataValid();
     // });

     setDidDataEditor(editor: JsonEditorComponent) {
          this.didDataEditor.set(editor);
     }

     setDidDocumentEditor(editor: JsonEditorComponent) {
          this.didDocumentEditor.set(editor);
     }

     setUriDataEditor(editor: JsonEditorComponent) {
          this.uriDataEditor.set(editor);
     }

     getJsonObjectError = (value: string | null | undefined, fieldName: string = 'Data'): string => {
          if (!value || value.trim() === '') return '';

          try {
               const parsed = JSON.parse(value);

               if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    return `${fieldName} must be a valid JSON object (not an array or primitive value).`;
               }

               return ''; // valid
          } catch (e) {
               return `Invalid JSON format in ${fieldName}. Please check your syntax.`;
          }
     };

     // getMetadataErrorMessage = computed(() => {
     //      const metadata = this.didStoreService.didDocumentData();
     //      if (!metadata || metadata.trim() === '') return '';

     //      try {
     //           JSON.parse(metadata);

     //           // Check if it's an object
     //           const parsed = JSON.parse(metadata);
     //           if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
     //                return 'Metadata must be a valid JSON object (not an array or primitive value).';
     //           }

     //           return '';
     //      } catch (e) {
     //           return 'Invalid JSON format. Please check your syntax.';
     //      }
     // });
}
