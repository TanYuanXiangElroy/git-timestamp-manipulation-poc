import ContributionGraph from "@/components/ContributionGraph";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-6xl w-full text-center mb-10">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4">
          git-contribution-hack
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Design your GitHub contribution graph. Draw pixel art, fake a streak, 
          or just make everything green.
        </p>
      </div>

      <ContributionGraph />
    </main>
  );
}