import('png-to-ico').then(async ({ default: pngToIco }) => {
  const sharp = require('sharp');
  const fs = require('fs');
  const sizes = [16, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(
    sizes.map(s =>
      sharp('resources/icons/appIcon.png').resize(s, s).png().toBuffer()
    )
  );
  const ico = await pngToIco(buffers);
  fs.writeFileSync('resources/icons/appIcon.ico', ico);
  console.log('appIcon.ico done');
}).catch(console.error);
