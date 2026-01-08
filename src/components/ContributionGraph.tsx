// src/components/ContributionGraph.tsx
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
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

import { generateScript } from "@/utils/generateScript";
import { fetchContributions } from "@/app/actions";

// GitHub's Color Palette 
const LEVELS = [
  "bg-[#ebedf0]", // 0: None (Gray)
  "bg-[#9be9a8]", // 1: Light Green
  "bg-[#40c463]", // 2: Medium Green
  "bg-[#30a14e]", // 3: Dark Green
  "bg-[#216e39]", // 4: Heavy Green
];

export default function ContributionGraph() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [brush, setBrush] = useState(4);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleDownload = () => {
    // 1. Generate the script string
    const scriptContent = generateScript(contributions);
    
    // 2. Create a Blob (a virtual file)
    const blob = new Blob([scriptContent], { type: "text/x-sh" });
    
    // 3. Create a fake download link and click it
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "git-art.sh"; // The filename
    document.body.appendChild(link);
    link.click();
    
    // 4. Cleanup
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const data = await fetchContributions(selectedYear);
      setContributions(data);
    } catch (error) {
      console.error("Failed to import:", error);
      alert("Failed to import GitHub data. Make sure you are logged in.");
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="flex flex-col items-center w-full max-w-[1200px] mx-auto p-4">
      
      {/* --- Main Toolbar Container --- */}
      <div className="flex flex-wrap items-center w-full bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-8 gap-4">
        
        {/* LEFT SIDE: Year & Brush */}
        <div className="flex items-center gap-6">
          
          {/* Year Selector */}
          <div className="flex items-center gap-3 relative z-10">
            <label className="text-sm font-bold text-gray-700">Year:</label>
            <div className="relative">
              <button
                onClick={() => setIsYearOpen(!isYearOpen)}
                className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 outline-none focus:ring-2 focus:ring-green-500 min-w-[80px] justify-between"
              >
                <span>{selectedYear}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isYearOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsYearOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-full min-w-[100px] bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                    {Array.from({ length: currentYear - 2008 + 1 }, (_, i) => currentYear - i).map((y) => (
                      <button
                        key={y}
                        onClick={() => {
                          setSelectedYear(y);
                          setContributions({});
                          setIsYearOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          selectedYear === y ? "bg-green-50 text-green-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Brush Controls */}
          <div className="flex items-center gap-3">
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
              className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 ml-2"
            >
              Clear
            </button>
          </div>
        </div>

        {/* RIGHT SIDE: Patterns, Download, Auth */}
        <div className="flex items-center gap-3 ml-auto">
          
          {/* Pattern Select */}
          <select 
            defaultValue="" 
            className="border border-gray-300 rounded px-3 py-2 text-xs bg-gray-50 outline-none cursor-pointer hover:bg-gray-50"
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

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-4.5-4.5m0 0l4.5-4.5m-4.5 4.5h14.75" />
            </svg>
            Download
          </button>

          {/* Divider */}
          <div className="h-8 w-[1px] bg-gray-300 mx-1"></div>

          {/* Auth Section (Now properly aligned right) */}
          <div>
            {!session ? (
              <button
                onClick={() => signIn("github")}
                className="bg-black text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2 hover:opacity-80"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Connect GitHub
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-700 leading-tight">
                    {/* @ts-expect-error type */}
                    {session.user?.login}
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {isLoading ? "Importing..." : "Import Graph"}
                  </button>
                </div>
                <img 
                  src={session.user?.image || ""} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-gray-200"
                />
                <button 
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Log Out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- The Graph Container (UNCHANGED BELOW) --- */}
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