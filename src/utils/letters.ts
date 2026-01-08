// src/utils/letters.ts

// 5x3 Bitmap Font (1 = pixel on, 0 = pixel off)
// Each array is a column.
const ALPHABET: Record<string, number[][]> = {
  A: [[0,1,1,1,1], [1,0,1,0,0], [0,1,1,1,1]],
  B: [[1,1,1,1,1], [1,0,1,0,1], [0,1,0,1,0]],
  C: [[0,1,1,1,0], [1,0,0,0,1], [1,0,0,0,1]],
  D: [[1,1,1,1,1], [1,0,0,0,1], [0,1,1,1,0]],
  E: [[1,1,1,1,1], [1,0,1,0,1], [1,0,1,0,1]],
  F: [[1,1,1,1,1], [1,0,1,0,0], [1,0,1,0,0]],
  G: [[0,1,1,1,0], [1,0,0,0,1], [1,0,1,1,1]],
  H: [[1,1,1,1,1], [0,0,1,0,0], [1,1,1,1,1]],
  I: [[1,0,0,0,1], [1,1,1,1,1], [1,0,0,0,1]],
  J: [[0,0,0,0,1], [0,0,0,0,1], [1,1,1,1,0]],
  K: [[1,1,1,1,1], [0,0,1,0,0], [1,1,0,1,1]],
  L: [[1,1,1,1,1], [0,0,0,0,1], [0,0,0,0,1]],
  M: [[1,1,1,1,1], [0,1,0,0,0], [1,1,1,1,1]],
  N: [[1,1,1,1,1], [1,0,0,0,0], [1,1,1,1,1]], // Wide N
  O: [[0,1,1,1,0], [1,0,0,0,1], [0,1,1,1,0]],
  P: [[1,1,1,1,1], [1,0,1,0,0], [0,1,0,0,0]],
  Q: [[0,1,1,1,0], [1,0,0,1,1], [0,1,1,1,1]],
  R: [[1,1,1,1,1], [1,0,1,0,0], [0,1,0,1,1]],
  S: [[1,1,1,0,1], [1,0,1,0,1], [1,0,1,1,1]], // Special S
  T: [[1,0,0,0,0], [1,1,1,1,1], [1,0,0,0,0]],
  U: [[1,1,1,1,0], [0,0,0,0,1], [1,1,1,1,0]],
  V: [[1,1,1,0,0], [0,0,0,1,1], [1,1,1,0,0]],
  W: [[1,1,1,1,0], [0,0,0,0,1], [1,1,1,1,0]],
  X: [[1,1,0,1,1], [0,0,1,0,0], [1,1,0,1,1]],
  Y: [[1,1,0,0,0], [0,0,1,1,1], [1,1,0,0,0]],
  Z: [[1,0,0,1,1], [1,0,1,0,1], [1,1,0,0,1]],
  " ": [[0,0,0,0,0], [0,0,0,0,0]], // Space

  // --- CUSTOM ICONS ---
  // :) or 😊 -> Smiley Face
  "😊": [
    [0,0,0,1,0], // Mouth Left
    [0,1,0,0,1], // Eye Left + Mouth
    [0,0,0,0,1], // Mouth Bottom
    [0,1,0,0,1], // Eye Right + Mouth
    [0,0,0,1,0], // Mouth Right
  ],
  
};

// Map old ascii to new emojis
const ALIASES: Record<string, string> = {
  ":)": "😊",
  "*": "😊",
};

export const getTextCoordinates = (text: string, startDate: Date) => {
  const coords: { x: number; y: number }[] = [];
  let currentX = 0; // Column offset relative to start

    let processedText = text.toUpperCase();


  // 1. Swap Aliases (:) -> 😊)
  Object.entries(ALIASES).forEach(([key, icon]) => {
    // Escape special regex characters if needed
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    processedText = processedText.replace(new RegExp(escapedKey, 'g'), icon);
  });

  // 2. Split string correctly (Use Array.from to handle Emojis correctly)
  // .split("") sometimes breaks emojis, Array.from() keeps them whole
  const chars = Array.from(processedText);

  chars.forEach((char) => {
    // 3. Look up char. If not found, skip it (or use space)
    const letter = ALPHABET[char];
    
    if (!letter) return; // Skip unknown characters
    
    // Loop through columns of the letter
    letter.forEach((column, colIndex) => {
      // Loop through rows (pixels) of the column
      column.forEach((pixel, rowIndex) => {
        if (pixel === 1) {
          // If the column has 7 pixels, we assume it's "Full Height" -> No offset
          // If it has 5 pixels (standard letters), we add +1 to center it
          const yOffset = column.length === 7 ? 0 : 1;
          
          coords.push({ 
            x: currentX + colIndex, 
            y: rowIndex + yOffset 
          });        }
      });
    });
    
    // Add space between letters (2 columns usually looks good)
    currentX += letter.length + 1;
  });

  return coords;
};