const fs = require('fs');

function fixHitSlop(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/hitSlop=\{\{([^}]*)start:([^}]*)end:([^}]*)\}\}/g, "hitSlop={{$1left:$2right:$3}}");
  content = content.replace(/hitSlop=\{\{([^}]*)end:([^}]*)start:([^}]*)\}\}/g, "hitSlop={{$1right:$2left:$3}}");
  content = content.replace(/start:([^,]*), end:([^,}]*)/g, "left:$1, right:$2");
  fs.writeFileSync(file, content);
}

fixHitSlop('./app/(tabs)/profile.tsx');
fixHitSlop('./app/family.tsx');
