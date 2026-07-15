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
    if (filePath.includes('animations/')) return;
    if (filePath.includes('AppText.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // We want to replace standard TouchableOpacity with AnimatedButton for key CTA buttons
    // But the user requested "Selective replacement".
    // We will target styles named "button", "btn", "primaryButton", "actionButton", "submitButton", "card", "statCard"
    // To do this safely, we will look for <TouchableOpacity style={...}> where style contains those keywords
    
    // Simple regex to inject imports if we make changes
    let needsAnimatedButton = false;
    let needsAnimatedCard = false;

    // Very naive AST replacement isn't possible with regex easily, but we can do string replacement
    // for specific known instances like Paywall, Signup, Login, etc.
    // Actually, a better approach is to wrap main return elements in FadeInView.

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      changedFiles++;
    }
  });
});

console.log('Processed files:', changedFiles);
