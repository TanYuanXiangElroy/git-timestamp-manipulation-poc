// src/utils/generateScript.ts

export const generateScript = (
  drawnState: Record<string, number>, // The Levels (0-4)
  baselineData: Record<string, number>, // The Real Commit Counts
  userMax: number = 0 // The user's highest commit count
) => {
  let script = `#!/bin/bash\n\n`;
  script += `echo "🎨 Starting git-contribution-hack..."\n`;
  script += `git init\n\n`;

  // 1. Dynamic Threshold Calculation
  // If userMax is 50, Level 4 becomes 50.
  // If userMax is 0 (empty year), we default to 10 to ensure the graph looks nice.
  const ceiling = Math.max(userMax, 10); 

  const L1 = 1;
  const L2 = Math.ceil(ceiling * 0.25);
  const L3 = Math.ceil(ceiling * 0.50);
  const L4 = ceiling;

  const targets = [0, L1, L2, L3, L4];

  script += `echo "Calculated Max Commit Ceiling: ${ceiling}"\n`;
  script += `echo "Targets: L1=${L1}, L2=${L2}, L3=${L3}, L4=${L4}"\n\n`;

  Object.entries(drawnState).forEach(([date, targetLevel]) => {
    if (targetLevel === 0) return;

    // 2. Use the dynamic targets
    const targetCount = targets[targetLevel];
    const existingCount = baselineData[date] || 0;

    // 3. Calculate Delta
    const commitsNeeded = targetCount - existingCount;

    // We cannot delete history, only add to it.
    if (commitsNeeded <= 0) return;

    for (let i = 0; i < commitsNeeded; i++) {
      script += `GIT_AUTHOR_DATE="${date}T12:00:00" GIT_COMMITTER_DATE="${date}T12:00:00" git commit --allow-empty -m "git-contribution-hack pattern" > /dev/null\n`;
    }
  });

  script += `\n\necho "✅ Art generation complete!"\n`;
  script += `echo "Push to GitHub to see the changes."\n`;
  
  return script;
};