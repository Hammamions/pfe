const fs = require('fs');
const image = fs.readFileSync('c:/Users/Administrator/OneDrive/Desktop/pfe/hospital-mobile/assets/sahloul_logo.jpg');
const base64Image = Buffer.from(image).toString('base64');
const content = `export const sahloulLogoBase64 = 'data:image/jpeg;base64,${base64Image}';`;
fs.writeFileSync('c:/Users/Administrator/OneDrive/Desktop/pfe/hospital-mobile/app/logoBase64.js', content);
console.log('logoBase64.js generated successfully.');
