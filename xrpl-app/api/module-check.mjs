import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default async function handler(req, res) {
     const result = {
          nodeVersion: process.version,
          nodeExecutable: process.execPath,
          requireModule: process.features?.require_module ?? 'unavailable',
          scureBase: null,
          codec: null,
     };

     try {
          const base = require('@scure/base');

          result.scureBase = {
               success: true,
               exports: Object.keys(base),
          };
     } catch (error) {
          result.scureBase = {
               success: false,
               error: error.message,
          };
     }

     try {
          const codec = require('ripple-address-codec');

          result.codec = {
               success: true,
               exports: Object.keys(codec),
          };
     } catch (error) {
          result.codec = {
               success: false,
               error: error.message,
          };
     }

     return res.status(200).json(result);
}
