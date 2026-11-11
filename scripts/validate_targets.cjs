const fs = require('fs');
const d = JSON.parse(fs.readFileSync('scripts/visual_analysis_targets.json', 'utf8'));
console.log('Project:', d.project);
console.log('Targets count:', d.targets.length);
d.targets.forEach((t, i) => {
  console.log((i + 1) + '. [' + t.category + '] ' + t.name + ' (' + t.englishName + ') - ' + t.priority);
});
