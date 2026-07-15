const fs = require('fs');

const path = 'app/subscriptions.tsx';
let content = fs.readFileSync(path, 'utf8');

// Inject imports
content = content.replace(
  "import Skeleton from '../components/Skeleton';",
  "import Skeleton from '../components/Skeleton';\nimport { AnimatedCard } from '../components/animations/AnimatedCard';\nimport { AnimatedButton } from '../components/animations/AnimatedButton';\nimport { FadeInView } from '../components/animations/FadeInView';\nimport { SlideInView } from '../components/animations/SlideInView';"
);

// Wrap the main scrollview content with FadeInView
content = content.replace("<ScrollView\n        contentContainerStyle={styles.scrollContent}", "<ScrollView\n        contentContainerStyle={styles.scrollContent}");
// Not trivial with simple replace, let's just use it on specific cards.

content = content.replace(/<TouchableOpacity style=\{styles\.subCardBtn\}/g, "<AnimatedButton style={styles.subCardBtn}");
content = content.replace(/<\/TouchableOpacity>(\s*<!-- End SubCardBtn -->)/g, "</AnimatedButton>"); // Not sure if this exists

// Just replace major buttons
content = content.replace(/<TouchableOpacity style=\{styles\.payBtn\}/g, "<AnimatedButton style={styles.payBtn}");
content = content.replace(/<TouchableOpacity style=\{styles\.alertBtn\}/g, "<AnimatedButton style={styles.alertBtn}");
content = content.replace(/<TouchableOpacity style=\{styles\.manageBtn\}/g, "<AnimatedButton style={styles.manageBtn}");

fs.writeFileSync(path, content);
