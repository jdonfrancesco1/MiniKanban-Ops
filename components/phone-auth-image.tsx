export function PhoneAuthImage() {
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
      <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-purple-500/20 blur-xl"></div>
      <div className="absolute bottom-1/3 left-1/3 w-40 h-40 rounded-full bg-pink-500/20 blur-xl"></div>

      {/* Phone mockup */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-64 h-[500px] bg-[#111] rounded-[40px] border-[8px] border-[#222] shadow-2xl overflow-hidden">
          {/* Phone notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-[#222] rounded-b-xl z-10"></div>

          {/* Phone screen */}
          <div className="absolute inset-0 bg-[#1a0b2e] overflow-hidden">
            {/* App interface */}
            <div className="h-full w-full flex flex-col">
              {/* Status bar */}
              <div className="h-8 w-full bg-[#2a1b3e]/80 flex items-center justify-between px-4">
                <div className="text-white text-xs">9:41</div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                </div>
              </div>

              {/* App content */}
              <div className="flex-1 p-4 flex flex-col">
                <div className="text-center mb-6">
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    MiniKanban
                  </div>
                  <div className="text-white/70 text-sm mt-1">Verification</div>
                </div>

                <div className="bg-[#2a1b3e]/80 rounded-lg p-4 mb-4 border border-white/10">
                  <div className="text-white text-sm mb-2">Enter verification code</div>
                  <div className="flex justify-between">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-10 bg-[#3a2b4e] rounded flex items-center justify-center border border-white/10"
                      >
                        <span className="text-white">{i < 4 ? Math.floor(Math.random() * 10) : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-white/60 text-xs text-center mb-4">Code sent to +1 (555) 123-****</div>

                <div className="bg-pink-500 text-white text-center py-3 rounded-lg mb-3">Verify & Continue</div>

                <div className="text-pink-400 text-center text-sm">Resend Code</div>
              </div>
            </div>

            {/* Animated dots */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-purple-400 animate-ping"></div>
            <div
              className="absolute bottom-1/3 right-1/4 w-2 h-2 rounded-full bg-pink-400 animate-ping"
              style={{ animationDelay: "1s" }}
            ></div>
            <div
              className="absolute top-2/3 right-1/3 w-2 h-2 rounded-full bg-orange-400 animate-ping"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
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

      {/* SMS message bubbles */}
      <div className="absolute bottom-10 left-10 w-48 bg-[#2a1b3e]/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/10 transform rotate-[-6deg]">
        <div className="text-xs text-white/70 mb-1">MiniKanban</div>
        <div className="text-sm text-white">Your verification code is: 123456</div>
        <div className="text-[10px] text-white/50 text-right mt-1">Just now</div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent opacity-40"></div>
    </div>
  )
}
