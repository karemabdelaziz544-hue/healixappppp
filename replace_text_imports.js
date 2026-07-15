const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

const targetDirs = ['app', 'components', 'src'];
let changedFiles = 0;

targetDirs.forEach(dir => {
  walk(dir, (filePath) => {
    // Skip the component itself
    if (filePath.includes('AppText.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Check if Text or TextInput are imported from react-native
    const rnImportRegex = /import\s+{([^}]*)}\s+from\s+['"]react-native['"]/;
    const match = content.match(rnImportRegex);
    
    if (match) {
      let imports = match[1].split(',').map(s => s.trim());
      const hasText = imports.includes('Text');
      const hasTextInput = imports.includes('TextInput');
      
      if (hasText || hasTextInput) {
        // Remove them from react-native import
        imports = imports.filter(i => i !== 'Text' && i !== 'TextInput');
        
        let newRnImport = '';
        if (imports.length > 0) {
           newRnImport = `import { ${imports.join(', ')} } from 'react-native';`;
        }
        
        content = content.replace(match[0], newRnImport);
        
        // Add AppText import
        const toImport = [];
        if (hasText) toImport.push('Text');
        if (hasTextInput) toImport.push('TextInput');
        
        const appTextImport = `import { ${toImport.join(', ')} } from '@/components/AppText';\n`;
        content = appTextImport + content;
        
        fs.writeFileSync(filePath, content, 'utf8');
        changedFiles++;
      }
    }
  });
});

console.log('Changed files:', changedFiles);
