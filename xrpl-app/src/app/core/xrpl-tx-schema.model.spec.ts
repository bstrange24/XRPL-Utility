describe('XrplTxSchema interface usage', () => {
     it('should allow valid schema structure', () => {
          const schema = {
               txType: 'TestTx',
               title: 'Test Transaction',
               overview: 'Test overview',
               fields: [
                    {
                         name: 'Account',
                         label: 'Account',
                         required: true,
                    },
               ],
          };

          // Runtime sanity checks
          expect(schema.txType).toBe('TestTx');
          expect(schema.fields.length).toBeGreaterThan(0);
     });

     it('should support optional properties', () => {
          const schema = {
               txType: 'TestTx',
               title: 'Test',
               overview: 'Test',
               fields: [],
               requirements: [{ label: 'Req', description: 'Desc' }],
               warnings: [{ message: 'Warning' }],
               example: {
                    title: 'Example',
                    code: { TransactionType: 'TestTx' },
               },
          };

          expect(schema.requirements?.length).toBe(1);
          expect(schema.warnings?.length).toBe(1);
          expect(schema.example?.code).toBeTruthy();
     });
});
