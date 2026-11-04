export default async function handler(req, res) {
     console.log('VERCEL NODE VERSION:', process.version);
     console.log('VERCEL NODE EXECUTABLE:', process.execPath);

     return res.status(200).json({
          nodeVersion: process.version,
          nodeExecutable: process.execPath,
          nodeMajorVersion: process.versions.node.split('.')[0],
     });
}
