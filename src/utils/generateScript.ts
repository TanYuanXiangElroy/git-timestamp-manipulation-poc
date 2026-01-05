// src/utils/generateScript.ts

export const generateScript = (contributions: Record<string, number>) => {
  // 1. Start the script with a Shebang (for bash)
  let script = `#!/bin/bash\n\n`;
  script += `echo "🎨 Starting git-contribution-hack..."\n`;
  script += `git init\n\n`;

  // 2. Loop through every date in the state
  Object.entries(contributions).forEach(([date, level]) => {
    // Skip if level is 0 (no paint)
    if (level === 0) return;

    // Map intensity level to number of commits
    // Level 1=1, Level 2=4, Level 3=9, Level 4=15 commits
    // This ensures distinct colors on the GitHub graph
    const commitCount = level === 1 ? 1 : level === 2 ? 4 : level === 3 ? 9 : 15;

    for (let i = 0; i < commitCount; i++) {
      // 3. Generate the git commit command with a fake date
      // We use --allow-empty so we don't have to actually change files
      // We set GIT_AUTHOR_DATE and GIT_COMMITTER_DATE to trick GitHub
      script += `GIT_AUTHOR_DATE="${date}T12:00:00" GIT_COMMITTER_DATE="${date}T12:00:00" git commit --allow-empty -m "git-contribution-hack pattern" > /dev/null\n`;
    }
  });

  script += `\necho "✅ Art generation complete!"\n`;
  script += `echo "Now push this repo to GitHub to see your graph update."\n`;
  
  return script;
};