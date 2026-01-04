// src/components/ContributionGraph.tsx
"use client";

import { useState, useMemo } from "react";
import { 
  format, 
  eachDayOfInterval, 
  endOfYear, 
  startOfYear, 
  startOfWeek,
  endOfWeek,
  getMonth
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
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [brush, setBrush] = useState(4);

  // Generate calendar data
  const calendarData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    
    const calendarStart = startOfWeek(yearStart, { weekStartsOn: 0 }); // Sunday start
    const calendarEnd = endOfWeek(yearEnd, { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    allDays.forEach((day) => {
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
    calendarData.flat().forEach(day => {
      if (day && day.getFullYear() === selectedYear) {
        const dateStr = format(day, "yyyy-MM-dd");
        if (Math.random() > 0.6) { // Only fill 40% of cells for noise look
             newContributions[dateStr] = Math.ceil(Math.random() * 4); 
        }
      }
    });
    setContributions(newContributions);
  };

  const paint = (dateStr: string) => {
    setContributions((prev) => ({
      ...prev,
      [dateStr]: brush,
    }));
  };

  const getColor = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    if (day.getFullYear() !== selectedYear) return "bg-transparent pointer-events-none"; 
    const level = contributions[dateStr] || 0;
    return LEVELS[level];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[1000px] mx-auto p-4">
      
      {/* --- Toolbar --- */}
      <div className="flex flex-wrap items-center justify-between w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 gap-4">
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setContributions({});
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 outline-none"
          >
            {/* Show current year back to 2008 (GitHub's founding year) */}
            {Array.from({ length: currentYear - 2008 + 1 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">Brush:</span>
          <div className="flex gap-1">
            {LEVELS.map((color, level) => (
              <button
                key={level}
                onClick={() => setBrush(level)}
                className={`w-6 h-6 rounded-sm border ${color} ${
                  brush === level ? "border-black scale-110" : "border-gray-200"
                }`}
              />
            ))}
          </div>
          <button 
            onClick={() => setContributions({})}
            className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50 ml-2"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select 
            defaultValue="" 
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 outline-none"
            onChange={(e) => {
              if (e.target.value === "random-noise") {
                generateRandomNoise();
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>Patterns</option>
            <option value="random-noise">Random Noise</option>
          </select>
        </div>
      </div>

      {/* --- The Graph Container --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 select-none overflow-x-auto w-full flex justify-center">
        <div className="flex gap-2">
          
          {/* 1. Day Labels Column (Fixed Width) */}
          {/* We use the exact same grid logic (h-11px + gap-2px) to align text */}
          <div className="flex flex-col gap-[2px] pt-5 text-[10px] text-gray-400 font-medium text-right pr-1">
            <div className="h-[11px]"></div> {/* Sun */}
            <div className="h-[11px] leading-[11px]">Mon</div>
            <div className="h-[11px]"></div> {/* Tue */}
            <div className="h-[11px] leading-[11px]">Wed</div>
            <div className="h-[11px]"></div> {/* Thu */}
            <div className="h-[11px] leading-[11px]">Fri</div>
            <div className="h-[11px]"></div> {/* Sat */}
          </div>

          {/* 2. The Main Grid Area */}
          <div className="flex gap-[2px]">
            {calendarData.map((week, wIndex) => {
              // Month Label Logic
              const firstDay = week[0];
              const prevWeekFirstDay = calendarData[wIndex - 1]?.[0];
              
              // Show label if month changes, or if it's the first week of the year
              let showMonthLabel = false;
              if (firstDay && firstDay.getFullYear() === selectedYear) {
                 if (wIndex === 0) {
                    showMonthLabel = true;
                 } else if (prevWeekFirstDay && getMonth(firstDay) !== getMonth(prevWeekFirstDay)) {
                    showMonthLabel = true;
                 }
              }

              return (
                <div key={wIndex} className="flex flex-col gap-[2px]">
                  {/* Month Label Header Cell */}
                  <div className="h-4 text-[10px] text-gray-400 text-left relative">
                    {showMonthLabel && firstDay && (
                      <span className="absolute top-0 left-0 w-8">
                        {format(firstDay, "MMM")}
                      </span>
                    )}
                  </div>

                  {/* The 7 Days of the Week */}
                  {week.map((day, dIndex) => {
                    if (!day) return <div key={dIndex} className="w-[11px] h-[11px]" />;
                    
                    const dateStr = format(day, "yyyy-MM-dd");
                    return (
                      <div
                        key={dIndex}
                        onMouseDown={() => {
                            if (day.getFullYear() === selectedYear) paint(dateStr);
                            setIsMouseDown(true);
                        }}
                        onMouseEnter={() => {
                          if (isMouseDown && day.getFullYear() === selectedYear) paint(dateStr);
                        }}
                        onMouseUp={() => setIsMouseDown(false)}
                        className={`w-[11px] h-[11px] rounded-[2px] ${getColor(day)} ${
                            day.getFullYear() === selectedYear ? "hover:ring-1 hover:ring-gray-400" : ""
                        }`}
                        title={`${dateStr}: ${contributions[dateStr] || 0} contributions`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}