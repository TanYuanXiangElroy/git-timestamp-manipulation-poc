// src/components/ContributionGraph.tsx
"use client";

import { useState, useMemo } from "react";
import { 
  format, 
  eachDayOfInterval, 
  endOfYear, 
  startOfYear, 
  isSameMonth, 
  startOfWeek,
  endOfWeek,
} from "date-fns";

// GitHub's Color Palette 
const LEVELS = [
  "bg-[#ebedf0]", // 0: None (Gray)
  "bg-[#9be9a8]", // 1: Light Green
  "bg-[#40c463]", // 2: Medium Green
  "bg-[#30a14e]", // 3: Dark Green
  "bg-[#216e39]", // 4: Heavy Green
];
export default function ContributionGraph() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  // Store contributions as a map: "2024-01-01" -> 4
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [brush, setBrush] = useState(4);

  // Generate the full calendar data for the selected year
  // Returns an array of Weeks, where each Week is an array of 7 Days (or null for padding)
  const calendarData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    
    // Find the very first Sunday before or on Jan 1st to align the grid properly
    const calendarStart = startOfWeek(yearStart);
    const calendarEnd = endOfWeek(yearEnd);

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weeks = [];
    let currentWeek: (Date | null)[] = [];

    allDays.forEach((day) => {
      // If the day is valid for this year row logic, add it.
      // We process strictly 7 days at a time.
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  }, [selectedYear]);

  const generateRandomNoise = () => {
    const newContributions: Record<string, number> = {};
    calendarData.forEach(week => {
      week.forEach(day => {
        if (day && day.getFullYear() === selectedYear) {
          const dateStr = format(day, "yyyy-MM-dd");
          // Generate a random intensity level between 0 and 4
          newContributions[dateStr] = Math.floor(Math.random() * 5); 
        }
      });
    });
    setContributions(newContributions);
  };

  const paint = (dateStr: string) => {
    setContributions((prev) => ({
      ...prev,
      [dateStr]: brush,
    }));
  };

  // Helper: Get color class for a specific date
  const getColor = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    // If the day is not in the selected year (padding from prev/next year), hide it or gray it
    if (day.getFullYear() !== selectedYear) return "bg-transparent"; 
    
    const level = contributions[dateStr] || 0;
    return LEVELS[level];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[1200px] mx-auto p-4">
      
      {/* --- Toolbar --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 gap-4">
        
        {/* Year Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setContributions({}); // Clear grid on year change
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer focus:ring-2 focus:ring-green-500 outline-none"
          >
            {/* Generate last 5 years up to current year */}
            {Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Brush Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">Brush:</span>
          <div className="flex gap-1.5 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            {LEVELS.map((color, level) => (
              <button
                key={level}
                onClick={() => setBrush(level)}
                className={`w-6 h-6 rounded-md transition-transform ${color} ${
                  brush === level ? "scale-125 shadow-sm ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"
                }`}
                title={`Level ${level}`}
              />
            ))}
          </div>
          <button 
            onClick={() => setContributions({})}
            className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 border border-red-200 rounded hover:bg-red-50 transition-colors ml-2"
          >
            Clear
          </button>
        </div>

        {/* Patterns */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Pattern:</label>
          <select 
            defaultValue="" // Set a default value to allow the "Select Pattern" option to be displayed initially
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer focus:ring-2 focus:ring-green-500 outline-none"
            onChange={(e) => {
              // Handle pattern selection
              const patternType = e.target.value;
              if (patternType === "random-noise") {
                // Call function to generate random noise
                generateRandomNoise();
                // Reset the select to "Select Pattern" after action
                e.target.value = "";
              }
            }}
          >
            <option value="">Select Pattern</option>
            <option value="random-noise">Random Noise</option>
          </select>
        </div>
      </div>

      {/* --- The Graph --- */}
      <div 
        className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 select-none overflow-x-auto w-full flex justify-center"
        onMouseLeave={() => setIsMouseDown(false)}
      >
        <div className="inline-flex flex-col gap-1">
          
          {/* Month Labels Row */}
          <div className="flex h-5 mb-1 text-[10px] text-gray-400 font-medium relative">
            {/* Spacer for the row labels */}
            <div className="w-8 shrink-0" />
            
            {/* Render weeks for month calculation */}
            {calendarData.map((week, index) => {
              const firstDayOfWeek = week[0];
              if (!firstDayOfWeek) return <div key={index} className="w-[13px] mx-[1px]" />;

              // Determine if we should show a month label here
              // Logic: Show label if this week's first day is the start of a month, 
              // OR if it's the very first week of the year.
              
              // Only show distinct month labels. 
              // We check if the previous week was in a different month.
              const prevWeek = calendarData[index - 1];
              const prevDate = prevWeek ? prevWeek[0] : null;
              const monthChanged = !prevDate || !isSameMonth(firstDayOfWeek, prevDate);

              // Don't show label if we are in previous year padding (e.g. Dec 2023 showing up in 2024 grid)
              if (firstDayOfWeek.getFullYear() !== selectedYear) {
                 return <div key={index} className="w-[13px] mx-[1px]" />;
              }

              if (monthChanged) {
                return (
                  <div key={index} className="w-[13px] mx-[1px] relative overflow-visible">
                    <span className="absolute top-0 left-0">
                      {format(firstDayOfWeek, "MMM")}
                    </span>
                  </div>
                );
              }
              return <div key={index} className="w-[13px] mx-[1px]" />;
            })}
          </div>

          <div className="flex">
            {/* Row Labels (Mon, Wed, Fri) */}
            {/* GitHub starts on Sunday (row 0), but labels 1 (Mon), 3 (Wed), 5 (Fri) */}
            <div className="flex flex-col gap-[3px] mr-2 text-[10px] text-gray-400 font-medium pt-[13px]">
               {/* 13px padding pushes labels down to align with Mon/Wed/Fri rows */}
              <div className="h-[10px] leading-[10px] opacity-0">Sun</div>
              <div className="h-[10px] leading-[10px]">Mon</div>
              <div className="h-[10px] leading-[10px] opacity-0">Tue</div>
              <div className="h-[10px] leading-[10px]">Wed</div>
              <div className="h-[10px] leading-[10px] opacity-0">Thu</div>
              <div className="h-[10px] leading-[10px]">Fri</div>
              <div className="h-[10px] leading-[10px] opacity-0">Sat</div>
            </div>

            {/* The Grid Cells */}
            <div 
              className="flex gap-[2px]"
              onMouseDown={() => setIsMouseDown(true)}
              onMouseUp={() => setIsMouseDown(false)}
            >
              {calendarData.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dIndex) => {
                    if (!day) return null;
                    const dateStr = format(day, "yyyy-MM-dd");
                    const colorClass = getColor(day);
                    
                    return (
                      <div
                        key={`${wIndex}-${dIndex}`}
                        onMouseDown={() => {
                            if (day.getFullYear() === selectedYear) paint(dateStr);
                        }}
                        onMouseEnter={() => {
                          if (isMouseDown && day.getFullYear() === selectedYear) paint(dateStr);
                        }}
                        className={`w-[11px] h-[11px] rounded-[2px] ${colorClass} ${
                            day.getFullYear() === selectedYear ? "cursor-pointer hover:ring-1 hover:ring-gray-400" : "cursor-default"
                        }`}
                        title={`${dateStr}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}