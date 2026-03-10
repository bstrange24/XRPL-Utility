import { XrplTxSchema } from './xrpl-tx-schema.model';

export const XRPL_TX_REGISTRY: Record<string, XrplTxSchema> = {
     CredentialCreate: {
          txType: 'CredentialCreate',
          title: 'Create Credential',
          overview: 'Creates a credential issued by the current account to a subject. The credential must be accepted by the subject before becoming active.',
          requirements: [
               {
                    label: 'Issuer account',
                    description: 'The currently selected wallet becomes the issuer of the credential.',
               },

               {
                    label: 'Valid XRPL address',
                    description: 'The subject must be a valid XRPL classic address.',
               },

               {
                    label: 'Credential type',
                    description: 'Must be a 128-character hexadecimal identifier representing the credential class.',
               },
          ],
          warnings: [
               {
                    message: 'Credentials remain pending until the subject accepts them.',
               },
               {
                    message: 'Expired credentials cannot be accepted.',
               },
          ],
          fields: [
               {
                    name: 'Subject',
                    label: 'Subject',
                    required: true,
                    description: 'Account receiving the credential.',
               },
               {
                    name: 'CredentialType',
                    label: 'Credential Type',
                    required: true,
                    description: '128-character hexadecimal credential identifier.',
                    example: '4A4F425F564552494649434154494F4E',
               },
               {
                    name: 'URI',
                    label: 'Credential URI',
                    required: false,
                    description: 'Optional link containing additional metadata about the credential.',
                    example: 'https://example.com/vc/123',
               },
               {
                    name: 'Expiration',
                    label: 'Expiration',
                    required: false,
                    description: 'Optional expiration time in Ripple epoch seconds.',
               },
          ],

          example: {
               title: 'Example Transaction',
               code: {
                    TransactionType: 'CredentialCreate',
                    Account: 'rIssuerAddress',
                    Subject: 'rSubjectAddress',
                    CredentialType: '4A4F425F564552494649434154494F4E',
                    URI: 'https://example.com/vc/123',
               },
          },
     },
     // CredentialCreate: {
     //      txType: 'CredentialCreate',
     //      title: 'Create Credential',
     //      description: 'Creates a credential issued to a subject account.',
     //      fields: [
     //           {
     //                name: 'Account',
     //                label: 'Issuer Account',
     //                required: true,
     //                description: 'The account issuing the credential.',
     //           },
     //           {
     //                name: 'Subject',
     //                label: 'Subject',
     //                required: true,
     //                description: 'The account receiving the credential.',
     //           },
     //           {
     //                name: 'CredentialType',
     //                label: 'Credential Type',
     //                required: true,
     //                description: 'Hex encoded credential type identifier.',
     //           },
     //           {
     //                name: 'URI',
     //                label: 'Credential URI',
     //                required: false,
     //                description: 'External link to credential metadata.',
     //           },
     //           {
     //                name: 'Expiration',
     //                label: 'Expiration',
     //                required: false,
     //                description: 'Time after which the credential becomes invalid.',
     //           },
     //      ],
     // },

     // CredentialAccept: {
     //      txType: 'CredentialAccept',
     //      title: 'Accept Credential',
     //      description: 'Accepts a credential issued to the account.',
     //      fields: [
     //           {
     //                name: 'CredentialID',
     //                label: 'Credential ID',
     //                required: true,
     //                description: 'Ledger index identifying the credential.',
     //           },
     //      ],
     // },

     // CredentialDelete: {
     //      txType: 'CredentialDelete',
     //      title: 'Delete Credential',
     //      description: 'Deletes a previously issued credential.',
     //      fields: [
     //           {
     //                name: 'CredentialID',
     //                label: 'Credential ID',
     //                required: true,
     //                description: 'Ledger index identifying the credential.',
     //           },
     //      ],
     // },

     // CredentialVerify: {
     //      txType: 'CredentialVerify',
     //      title: 'Verify Credential',
     //      description: 'Checks if a credential exists and is valid.',
     //      fields: [
     //           {
     //                name: 'CredentialID',
     //                label: 'Credential ID',
     //                required: true,
     //                description: 'Ledger index identifying the credential.',
     //           },
     //           {
     //                name: 'CredentialType',
     //                label: 'Credential Type',
     //                required: true,
     //                description: 'Hex encoded credential type.',
     //           },
     //      ],
     // },
};
