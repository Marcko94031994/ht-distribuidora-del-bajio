const fs = require('fs');
const path = require('path');

function fixEncoding(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixEncoding(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
            const buf = fs.readFileSync(fullPath);
            let content = buf.toString('latin1');
            try {
                // If the text is actually valid utf8 but misinterpreted as latin1, this fixes it.
                // Replace garbled characters directly.
                let newContent = content.replace(/Ã³/g, 'ó')
                                       .replace(/Ã±/g, 'ñ')
                                       .replace(/Ã¡/g, 'á')
                                       .replace(/Ã©/g, 'é')
                                       .replace(/Ã\xad/g, 'í') // \xad is the Latin1 representation of the second byte of í
                                       .replace(/Ãº/g, 'ú')
                                       .replace(/Ã /g, 'Á')
                                       .replace(/Ã‰/g, 'É')
                                       .replace(/Ã /g, 'Í')
                                       .replace(/Ã“/g, 'Ó')
                                       .replace(/Ãš/g, 'Ú')
                                       .replace(/Ã‘/g, 'Ñ');
                fs.writeFileSync(fullPath, newContent, 'utf8');
            } catch(e) {}
        }
    }
}

fixEncoding('c:/Pages/HT DISTRIBUIDORA DEL BAJIO/frontend/src');
console.log('Encoding fixed.');
