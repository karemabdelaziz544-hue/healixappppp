const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let count = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('useEffect(')) {
    // Basic heuristic to check for potential missing cleanups or floating promises
    // A proper AST would be better, but we just want to flag files for review.
    if (content.includes('setInterval(') && !content.includes('clearInterval(')) {
      console.log(`Potential interval leak: ${file}`);
      count++;
    }
    if (content.includes('setTimeout(') && !content.includes('clearTimeout(')) {
      console.log(`Potential timeout leak: ${file}`);
      count++;
    }
  }
});
console.log(`Found ${count} potential leaks.`);
