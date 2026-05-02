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
};
