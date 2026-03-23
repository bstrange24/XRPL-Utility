const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.post('/compile', (req, res) => {
     try {
          const { requireCredential = false } = req.body;

          const source = `
#include "hookapi.h"

// CredentialIDs field ID (common value from XRPL/Xahau)
#ifndef sfCredentialIDs
#define sfCredentialIDs 280
#endif

// Convenience macro for string literals (common in Xahau examples)
#define STR(x) ((uint32_t)(x)), (sizeof(x)-1)

int64_t hook(uint32_t reserved) {
    // Check if the transaction is a payment
    if (otxn_type() != ttPAYMENT) {
        accept(STR("Not a payment transaction"), 0);
        return 0;  // or return -1 if you want to reject, but accept() already handles it
    }

    // Check for credentials if required
    if (${requireCredential ? '1' : '0'}) {
        uint8_t cred_buf[32];
        int64_t cred_len = otxn_field((uint32_t)cred_buf, 32, sfCredentialIDs);
        
        if (cred_len <= 0) {
            rollback(STR("Missing CredentialIDs"), 0);
            return 0;  // rollback already exits the hook
        }
    }

    // Accept the transaction
    accept(STR("Hook executed successfully"), 0);
    return 0;
}
`;

          // Write the source file
          fs.writeFileSync('hook.c', source);
          console.log('hook.c written');

          // Get absolute path to hooks directory
          const hooksPath = path.join(__dirname, 'hooks');

          // Compile with -nostdlib and -Wl,--no-entry to avoid standard library linking
          const compileCommand = `clang \
            --target=wasm32 \
            -O2 \
            -I ${hooksPath} \
            -nostdlib \
            -Wl,--no-entry \
            -Wl,--export=hook \
            -Wl,--allow-undefined \
            -o hook.wasm \
            hook.c 2>&1`;

          console.log('Compiling hook...');
          const output = execSync(compileCommand, { encoding: 'utf-8' });
          console.log('Compilation output:', output);

          // Read the compiled wasm file
          if (fs.existsSync('hook.wasm')) {
               const wasm = fs.readFileSync('hook.wasm');
               console.log('WASM size:', wasm.length, 'bytes');

               res.json({
                    hex: wasm.toString('hex'),
                    size: wasm.length,
                    message: 'Hook compiled successfully',
               });
          } else {
               throw new Error('hook.wasm not created');
          }
     } catch (err) {
          console.error('Compilation error:', err.message);
          console.error('Output:', err.stdout);
          console.error('Error:', err.stderr);
          res.status(500).json({
               error: 'Compilation failed',
               details: err.stderr || err.message,
               output: err.stdout,
          });
     }
});

app.listen(4000, () => {
     console.log('Hook compiler running on port 4000');
});
