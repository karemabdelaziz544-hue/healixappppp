const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
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
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace Tajawal/Cairo literal strings in fontFamily
    content = content.replace(/fontFamily:\s*['"](Tajawal|Cairo)-Regular['"]/g, "fontFamily: AppFontFamily.regular");
    content = content.replace(/fontFamily:\s*['"](Tajawal|Cairo)-Medium['"]/g, "fontFamily: AppFontFamily.medium");
    content = content.replace(/fontFamily:\s*['"](Tajawal|Cairo)-Bold['"]/g, "fontFamily: AppFontFamily.bold");
    content = content.replace(/fontFamily:\s*['"](Tajawal|Cairo)-Light['"]/g, "fontFamily: AppFontFamily.light");
    content = content.replace(/fontFamily:\s*['"](Tajawal|Cairo)-Black['"]/g, "fontFamily: AppFontFamily.extraBold");

    // Also replace direct literal strings in the codebase if they missed fontFamily:
    content = content.replace(/['"](Tajawal|Cairo)-Regular['"]/g, "AppFontFamily.regular");
    content = content.replace(/['"](Tajawal|Cairo)-Medium['"]/g, "AppFontFamily.medium");
    content = content.replace(/['"](Tajawal|Cairo)-Bold['"]/g, "AppFontFamily.bold");

    if (content !== originalContent) {
      // Check if AppFontFamily is imported
      if (!content.includes('AppFontFamily')) {
        console.error('AppFontFamily used but not imported in', filePath);
      }
      
      const hasImport = content.match(/import\s+{[^}]*AppFontFamily[^}]*}\s+from\s+['"][^'"]+['"]/);
      if (!hasImport) {
        // try to find an existing import from constants/AppTheme
        const themeImport = content.match(/import\s+{([^}]+)}\s+from\s+['"][^'"]*AppTheme['"]/);
        if (themeImport) {
          content = content.replace(themeImport[0], `import {${themeImport[1]}, AppFontFamily } from '@/constants/AppTheme'`);
        } else {
          // add to top after react imports or first line
          content = `import { AppFontFamily } from '@/constants/AppTheme';\n` + content;
        }
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      changedFiles++;
    }
  });
});

console.log('Changed files:', changedFiles);
