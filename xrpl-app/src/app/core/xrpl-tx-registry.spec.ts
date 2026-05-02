import { XRPL_TX_REGISTRY } from './xrpl-tx-registry';

describe('XRPL_TX_REGISTRY', () => {
     it('should not be empty', () => {
          expect(Object.keys(XRPL_TX_REGISTRY).length).toBeGreaterThan(0);
     });

     Object.entries(XRPL_TX_REGISTRY).forEach(([key, schema]) => {
          describe(`${key}`, () => {
               it('should match txType with key', () => {
                    expect(schema.txType).toBe(key);
               });

               it('should have title and overview', () => {
                    expect(schema.title).toBeTruthy();
                    expect(schema.overview).toBeTruthy();
               });

               it('should define fields', () => {
                    expect(Array.isArray(schema.fields)).toBeTrue();
                    expect(schema.fields.length).toBeGreaterThan(0);
               });

               it('fields should be valid', () => {
                    schema.fields.forEach(field => {
                         expect(field.name).toBeTruthy();
                         expect(field.label).toBeTruthy();
                         expect(typeof field.required).toBe('boolean');
                         expect(field.description).toBeTruthy();
                    });
               });

               // ✅ SAFE: requirements may be undefined
               it('requirements should be valid if present', () => {
                    if (!schema.requirements) return;

                    expect(schema.requirements.length).toBeGreaterThan(0);

                    schema.requirements.forEach(req => {
                         expect(req.label).toBeTruthy();
                         expect(req.description).toBeTruthy();
                    });
               });

               // ✅ SAFE: warnings optional
               it('warnings should be valid if present', () => {
                    if (!schema.warnings) return;

                    schema.warnings.forEach(w => {
                         expect(w.message).toBeTruthy();
                    });
               });

               // ✅ SAFE: example optional
               it('example should be valid if present', () => {
                    if (!schema.example) return;

                    expect(schema.example.code).toBeTruthy();
                    expect(schema.example.code.TransactionType).toBe(schema.txType);
               });
          });
     });

     // ---------------- SPECIFIC ----------------

     describe('CredentialCreate specifics', () => {
          const schema = XRPL_TX_REGISTRY['CredentialCreate']; // ✅ FIXED

          it('should exist', () => {
               expect(schema).toBeTruthy();
          });

          it('should contain required fields', () => {
               const names = schema.fields.map(f => f.name);

               expect(names).toContain('Subject');
               expect(names).toContain('CredentialType');
          });

          it('required fields should be enforced', () => {
               const subject = schema.fields.find(f => f.name === 'Subject');
               const type = schema.fields.find(f => f.name === 'CredentialType');

               expect(subject?.required).toBeTrue();
               expect(type?.required).toBeTrue();
          });

          it('optional fields should not be required', () => {
               const uri = schema.fields.find(f => f.name === 'URI');
               const expiration = schema.fields.find(f => f.name === 'Expiration');

               expect(uri?.required).toBeFalse();
               expect(expiration?.required).toBeFalse();
          });

          it('should have valid example', () => {
               expect(schema.example).toBeTruthy(); // narrow type

               const example = schema.example!; // ✅ safe after check

               expect(example.code).toBeTruthy();
               expect(example.code.TransactionType).toBe('CredentialCreate');
          });

          it('credential type should be hex-like', () => {
               const field = schema.fields.find(f => f.name === 'CredentialType');

               expect(field?.description?.toLowerCase()).toContain('hex');
          });
     });
});
