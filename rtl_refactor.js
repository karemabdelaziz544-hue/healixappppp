const fs = require('fs');
const path = require('path');

const replacements = [
  [/marginLeft/g, 'marginStart'],
  [/marginRight/g, 'marginEnd'],
  [/paddingLeft/g, 'paddingStart'],
  [/paddingRight/g, 'paddingEnd'],
  [/borderTopLeftRadius/g, 'borderTopStartRadius'],
  [/borderTopRightRadius/g, 'borderTopEndRadius'],
  [/borderBottomLeftRadius/g, 'borderBottomStartRadius'],
  [/borderBottomRightRadius/g, 'borderBottomEndRadius'],
  [/borderLeftWidth/g, 'borderStartWidth'],
  [/borderRightWidth/g, 'borderEndWidth'],
  [/borderLeftColor/g, 'borderStartColor'],
  [/borderRightColor/g, 'borderEndColor'],
  // Be careful with left: and right: in StyleSheet, it might replace variable names if not careful.
  // We'll only replace them if they are followed by a colon (e.g. left: 10)
  [/\bleft:\s*(-?\d+|'[^']*'|"[^"]*")/g, 'start: $1'],
  [/\bright:\s*(-?\d+|'[^']*'|"[^"]*")/g, 'end: $1'],
  // textAlign: 'right' -> textAlign: 'left' because in RTL, 'right' alignment means 'start' visually but actually RN textAlign 'right' remains visually right. But wait!
  // Actually, 'left' and 'right' in `textAlign` should be 'auto' or 'justify' or 'left'/'right'. RN supports `textAlign: 'auto'`. But we can also leave textAlign alone since it's sometimes explicit.
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      for (const [regex, replacement] of replacements) {
        newContent = newContent.replace(regex, replacement);
      }
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory('./app');
processDirectory('./components');
processDirectory('./src');
