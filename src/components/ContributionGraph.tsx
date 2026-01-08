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

import { getTextCoordinates } from "@/utils/letters";
import { addDays, addWeeks } from "date-fns"; 




// GitHub's Color Palette 
const LEVELS = [
  "bg-[#ebedf0]", // 0: None (Gray)
  "bg-[#9be9a8]", // 1: Light Green
  "bg-[#40c463]", // 2: Medium Green
  "bg-[#30a14e]", // 3: Dark Green
  "bg-[#216e39]", // 4: Heavy Green
];

// Helper to determine color level based on raw count and max ceiling
const getLevelFromCount = (count: number, max: number) => {
  if (count === 0) return 0;
  const ceiling = Math.max(max, 10);
  
  if (count >= ceiling) return 4;
  if (count >= Math.ceil(ceiling * 0.50)) return 3;
  if (count >= Math.ceil(ceiling * 0.25)) return 2;
  return 1;
};

export default function ContributionGraph() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isYearOpen, setIsYearOpen] = useState(false);
  
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [baseline, setBaseline] = useState<Record<string, number>>({}); // Raw counts
  const [maxCommits, setMaxCommits] = useState(0); // Max commit count for scaling

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [brush, setBrush] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false); // State for showing the warning modal

  const [patternMode, setPatternMode] = useState(""); // "" | "text" | "random"
  const [textInput, setTextInput] = useState("ELROY");
  const [textOffset, setTextOffset] = useState(2);

  // Generate calendar data
  const calendarData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    const calendarStart = startOfWeek(yearStart, { weekStartsOn: 0 }); 
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

  const confirmDownload = () => {
    const scriptContent = generateScript(contributions, baseline, maxCommits);
    
    const blob = new Blob([scriptContent], { type: "text/x-sh" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "git-art.sh";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowWarning(false); // Close modal after download
  };

  const handleDownload = () => {
    setShowWarning(true);
  };

  const handleImport = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      // Destructure data AND max
      const { data, max } = await fetchContributions(selectedYear);
      setBaseline(data);
      setMaxCommits(max);
      
      // Calculate initial visual state
      const visualLevels: Record<string, number> = {};
      Object.entries(data).forEach(([date, count]) => {
         visualLevels[date] = getLevelFromCount(count, max);
      });
      setContributions(visualLevels);
    } catch (error) {
      console.error("Failed to import:", error);
      alert("Failed to import GitHub data. Make sure you are logged in.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomNoise = () => {
    const newContributions: Record<string, number> = {};
    calendarData.forEach((week) => {
      week.forEach((day) => {
        if (day && day.getFullYear() === selectedYear) {
          const dateStr = format(day, "yyyy-MM-dd");
          if (Math.random() > 0.6) {
            newContributions[dateStr] = Math.ceil(Math.random() * 4);
          }
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

  const getColor = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    if (day.getFullYear() !== selectedYear) return "bg-transparent pointer-events-none"; 
    
    // 1. Get what user wants to paint
    const paintedLevel = contributions[dateStr] || 0;

    // 2. Get what really exists (and convert to level)
    const realCount = baseline[dateStr] || 0;
    const realLevel = getLevelFromCount(realCount, maxCommits);

    // 3. Show the HIGHER of the two. (Cannot erase history)
    const finalLevel = Math.max(paintedLevel, realLevel);

    return LEVELS[finalLevel];
  };

  const drawPattern = (type: string) => {
    const newContribs = { ...contributions }; // Keep existing or start fresh? Let's overlay.
    
    calendarData.flat().forEach((day, index) => {
      if (!day || day.getFullYear() !== selectedYear) return;
      const dateStr = format(day, "yyyy-MM-dd");

      if (type === "checkerboard") {
        if (index % 2 === 0) newContribs[dateStr] = 4;
      }
      if (type === "invert") {
        // If empty, make it full. If full, make it empty.
        const current = newContribs[dateStr] || 0;
        newContribs[dateStr] = current > 0 ? 0 : 4;
      }
    });
    setContributions(newContribs);
  };

  const drawText = () => {
    const startOfGraph = startOfWeek(startOfYear(new Date(selectedYear, 0, 1)), { weekStartsOn: 0 });
    const coords = getTextCoordinates(textInput, startOfGraph);
    
    const newContribs = { ...contributions };
    
    coords.forEach(({ x, y }) => {
      // x + textOffset shifts the text horizontally
      const targetDate = addDays(addWeeks(startOfGraph, x + Number(textOffset)), y);
      
      if (targetDate.getFullYear() === selectedYear) {
        newContribs[format(targetDate, "yyyy-MM-dd")] = 4;
      }
    });
    
    setContributions(newContribs);
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
          
          {/* Pattern / Text Control */}
          <div className="flex items-center gap-2">
            <select 
              value={patternMode}
              className="border border-gray-300 rounded px-3 py-2 text-xs bg-gray-50 outline-none cursor-pointer hover:bg-gray-50"
              onChange={(e) => {
                const val = e.target.value;
                if (val === "random-noise") {
                  generateRandomNoise();
                  setPatternMode(""); // Reset after generating
                } else {
                  setPatternMode(val); // Keep selected for Text Tool
                }
              }}
            >
              <option value="" disabled>Tools</option>
              <option value="text">Text Tool</option>
              <option value="random-noise">Random Noise</option>
            </select>

            {/* TEXT TOOL UI */}
            {patternMode === "text" && (
              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-4 duration-300 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <input 
                  type="text" 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value.toUpperCase())}
                  className="w-20 border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-green-500 uppercase"
                  placeholder="TEXT"
                  maxLength={10}
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-medium pl-1">Start Week:</span>
                  <input 
                    type="number" 
                    value={textOffset}
                    onChange={(e) => setTextOffset(Number(e.target.value))}
                    className="w-10 border border-gray-300 rounded px-1 py-1.5 text-xs outline-none focus:border-green-500"
                    min={0}
                    max={52}
                  />
                </div>
                <button 
                  onClick={drawText}
                  className="bg-green-600 text-white px-2 py-1.5 rounded text-xs hover:bg-green-700 ml-1 font-medium"
                >
                  Draw
                </button>
              </div>
            )}
          </div>

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

      {/* --- The Graph Container --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 select-none overflow-x-auto w-full flex justify-center">
        <div className="flex gap-2">
          
          {/* 1. Day Labels Column */}
          <div className="flex flex-col gap-[2px] pt-5 text-[10px] text-gray-400 font-medium text-right pr-1">
            <div className="h-[11px]"></div>
            <div className="h-[11px] leading-[11px]">Mon</div>
            <div className="h-[11px]"></div>
            <div className="h-[11px] leading-[11px]">Wed</div>
            <div className="h-[11px]"></div>
            <div className="h-[11px] leading-[11px]">Fri</div>
            <div className="h-[11px]"></div>
          </div>

          {/* 2. The Main Grid Area */}
          <div className="flex gap-[2px]">
            {calendarData.map((week, wIndex) => {
              const firstDay = week[0];
              const prevWeekFirstDay = calendarData[wIndex - 1]?.[0];
              
              let showMonthLabel = false;
              if (firstDay && firstDay.getFullYear() === selectedYear) {
                 if (wIndex === 0) showMonthLabel = true;
                 else if (prevWeekFirstDay && getMonth(firstDay) !== getMonth(prevWeekFirstDay)) showMonthLabel = true;
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
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900">Safety Warning</h3>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <p className="font-medium text-gray-900">
                This script generates fake git commits. Please read carefully:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Do NOT</strong> run this inside a real project (like your work repo). It will mess up your history.
                </li>
                <li>
                  Create a <strong>new, empty repository</strong> to run this script.
                </li>
                <li>
                  Commits made to <strong>future dates</strong> will not appear on your graph until that date arrives.
                </li>
                <li>
                  You can <strong>delete the repository</strong> to undo these changes at any time.
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowWarning(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDownload}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md transition-colors"
              >
                I understand, Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}