"use client"

export function HeroImage() {
  return (
    <div className="relative w-full h-full min-h-[310px] rounded-xl overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b3e] to-[#1a0b2e]"></div>

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)",
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-purple-500/20 blur-xl"></div>
      <div className="absolute bottom-1/3 right-1/3 w-40 h-40 rounded-full bg-pink-500/20 blur-xl"></div>
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-orange-500/20 blur-xl"></div>

      {/* Kanban board visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex gap-4 p-4 max-w-full overflow-hidden">
          {/* To Do Column */}
          <div className="flex flex-col w-40 bg-[#2a1b3e]/80 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
            <div className="p-2 border-b border-white/10 flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
              <h3 className="text-white text-sm font-medium">To Do</h3>
            </div>
            <div className="p-2 space-y-2">
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-purple-400/30 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-white/20 rounded"></div>
              </div>
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-purple-400/30 rounded mb-2"></div>
                <div className="w-1/2 h-2 bg-white/20 rounded"></div>
              </div>
            </div>
          </div>

          {/* In Progress Column */}
          <div className="flex flex-col w-40 bg-[#2a1b3e]/80 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
            <div className="p-2 border-b border-white/10 flex items-center">
              <div className="w-3 h-3 rounded-full bg-pink-400 mr-2"></div>
              <h3 className="text-white text-sm font-medium">In Progress</h3>
            </div>
            <div className="p-2 space-y-2">
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-pink-400/30 rounded mb-2"></div>
                <div className="w-2/3 h-2 bg-white/20 rounded"></div>
              </div>
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-pink-400/30 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-white/20 rounded"></div>
              </div>
            </div>
          </div>

          {/* Done Column */}
          <div className="flex flex-col w-40 bg-[#2a1b3e]/80 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
            <div className="p-2 border-b border-white/10 flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-400 mr-2"></div>
              <h3 className="text-white text-sm font-medium">Done</h3>
            </div>
            <div className="p-2 space-y-2">
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-orange-400/30 rounded mb-2"></div>
                <div className="w-1/2 h-2 bg-white/20 rounded"></div>
              </div>
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-orange-400/30 rounded mb-2"></div>
                <div className="w-2/3 h-2 bg-white/20 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              backgroundColor: ["#c084fc", "#e879f9", "#fb923c"][Math.floor(Math.random() * 3)],
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              transform: `translateY(${Math.random() * 100}px)`,
            }}
          ></div>
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent opacity-40"></div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
          100% {
            transform: translateY(0) translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
