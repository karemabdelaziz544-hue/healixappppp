const fs = require('fs');
const files = ['app/subscription-payment.tsx', 'components/bootstrap/StartupFailureBoundary.tsx'];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("fontFamily: 'monospace'")) {
    content = content.replace(/fontFamily:\s*['"]monospace['"]/g, "fontFamily: AppFontFamily.regular");
    // Add import if missing
    if (!content.includes('AppFontFamily')) {
      const themeImport = content.match(/import\s+{([^}]+)}\s+from\s+['"][^'"]*AppTheme['"]/);
      if (themeImport) {
        content = content.replace(themeImport[0], `import {${themeImport[1]}, AppFontFamily } from '@/constants/AppTheme'`);
      } else {
        content = `import { AppFontFamily } from '@/constants/AppTheme';\n` + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
