import * as codec from 'ripple-address-codec';

export default async function handler(req, res) {
     return res.status(200).json({
          success: true,
          message: 'ripple-address-codec loaded successfully',
          exports: Object.keys(codec),
     });
}
