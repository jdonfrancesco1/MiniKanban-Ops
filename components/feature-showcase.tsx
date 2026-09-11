type FeatureShowcaseProps = {
  title: string
  description: string
  imagePosition: "left" | "right"
  featureType: "drag-and-drop" | "instant-sharing" | "real-time"
}

export function FeatureShowcase({ title, description, imagePosition, featureType }: FeatureShowcaseProps) {
  return (
    <div className="mb-16 last:mb-0">
      <div
        className={`flex flex-col ${imagePosition === "right" ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 items-center`}
      >
        <div className="lg:w-1/2">
          <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
          <p className="text-white/70 text-lg">{description}</p>

          {featureType === "drag-and-drop" && (
            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">Intuitive card movement between columns</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">Visual feedback during drag operations</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">Automatic board reorganization</span>
              </li>
            </ul>
          )}

          {featureType === "instant-sharing" && (
            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">One-click link generation</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">SMS sharing with team members</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">No account required for viewers</span>
              </li>
            </ul>
          )}

          {featureType === "real-time" && (
            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">Instant updates across all devices</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">Conflict resolution for simultaneous edits</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                <span className="text-white/80">Visual indicators for changes made by others</span>
              </li>
            </ul>
          )}
        </div>

        <div className="lg:w-1/2">
          {featureType === "drag-and-drop" && <DragDropFeatureImage />}
          {featureType === "instant-sharing" && <SharingFeatureImage />}
          {featureType === "real-time" && <RealTimeFeatureImage />}
        </div>
      </div>
    </div>
  )
}

function DragDropFeatureImage() {
  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b3e] to-[#1a0b2e]"></div>

      {/* Grid background */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Dragged card */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 bg-[#3a2b4e] p-3 rounded-lg border-2 border-pink-500 shadow-lg shadow-pink-500/20 z-10 rotate-3">
        <div className="w-full h-3 bg-pink-400/30 rounded mb-3"></div>
        <div className="w-3/4 h-3 bg-white/20 rounded mb-2"></div>
        <div className="w-1/2 h-3 bg-white/20 rounded"></div>
        <div className="mt-3 flex gap-1">
          <div className="bg-pink-400/30 text-[10px] text-white/80 px-2 py-0.5 rounded">Design</div>
          <div className="bg-purple-400/30 text-[10px] text-white/80 px-2 py-0.5 rounded">UI</div>
        </div>
      </div>

      {/* Mouse cursor */}
      <div className="absolute top-[45%] left-[55%] w-6 h-6 z-20">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 2L18 13L13 14.5L16.5 20L13.5 22L10 16L5 19L7 2Z" fill="white" stroke="black" strokeWidth="1" />
        </svg>
      </div>

      {/* Motion path */}
      <div className="absolute top-[50%] left-[40%] w-[20%] h-[10%] border-2 border-dashed border-pink-400/50 rounded-lg z-0"></div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent opacity-40"></div>
    </div>
  )
}

function SharingFeatureImage() {
  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b3e] to-[#1a0b2e]"></div>

      {/* Grid background */}
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

      {/* Share dialog */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[280px] bg-[#2a1b3e] rounded-xl border border-white/10 shadow-xl overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <h3 className="text-white font-medium">Share Board</h3>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="text-sm text-white/70 mb-1">Board Link</div>
            <div className="flex">
              <div className="flex-1 bg-[#1a0b2e] border border-white/10 rounded-l-md p-2 text-sm text-white/80 truncate">
                minikanban.com/b/abc123
              </div>
              <div className="bg-pink-500 text-white p-2 rounded-r-md text-sm">Copy</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-sm text-white/70 mb-1">Share via SMS</div>
            <div className="flex">
              <input
                type="text"
                placeholder="+1 (555) 123-4567"
                className="flex-1 bg-[#1a0b2e] border border-white/10 rounded-l-md p-2 text-sm text-white/80"
              />
              <div className="bg-pink-500 text-white p-2 rounded-r-md text-sm">Send</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 border border-white/30 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-pink-400 rounded-sm"></div>
            </div>
            <span className="text-sm text-white/70">Allow editing</span>
          </div>
          <div className="bg-[#3a2b4e] rounded-md p-3 text-sm text-white/80">
            Anyone with the link can view this board
          </div>
        </div>
      </div>

      {/* Phone with SMS */}
      <div className="absolute bottom-4 right-4 w-[120px] h-[200px] bg-[#111] rounded-xl border-4 border-[#222] overflow-hidden shadow-lg">
        <div className="h-full w-full bg-[#1a0b2e] p-2">
          <div className="text-[8px] text-white/50 mb-1">Today, 2:34 PM</div>
          <div className="bg-[#3a2b4e] rounded-lg p-2 mb-2 text-[8px] text-white/90">
            <div className="text-[7px] text-pink-400 mb-0.5">MiniKanban</div>
            Alex shared a board with you: "Project Alpha"
            <div className="mt-1 text-[7px] text-pink-400 underline">minikanban.com/b/abc123</div>
          </div>
        </div>
      </div>

      {/* User avatars */}
      <div className="absolute top-4 left-4 flex -space-x-2">
        <div className="w-10 h-10 rounded-full bg-purple-500 border-2 border-[#1a0b2e] flex items-center justify-center text-white text-xs font-bold">
          AJ
        </div>
        <div className="w-10 h-10 rounded-full bg-pink-500 border-2 border-[#1a0b2e] flex items-center justify-center text-white text-xs font-bold">
          TS
        </div>
        <div className="w-10 h-10 rounded-full bg-orange-500 border-2 border-[#1a0b2e] flex items-center justify-center text-white text-xs font-bold">
          MK
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent opacity-40"></div>
    </div>
  )
}

function RealTimeFeatureImage() {
  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b3e] to-[#1a0b2e]"></div>

      {/* Grid background */}
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
            <div className="p-2 space-y-2 relative">
              <div className="bg-[#3a2b4e] p-2 rounded border border-white/5 shadow">
                <div className="w-full h-2 bg-pink-400/30 rounded mb-2"></div>
                <div className="w-2/3 h-2 bg-white/20 rounded"></div>
              </div>

              {/* Card being edited with real-time indicator */}
              <div className="bg-[#3a2b4e] p-2 rounded border border-pink-500/50 shadow-md relative">
                <div className="w-full h-2 bg-pink-400/30 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-white/20 rounded"></div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 border-2 border-[#2a1b3e] flex items-center justify-center text-white text-[8px] font-bold">
                  TS
                </div>
                <div className="absolute -top-1 -left-1 flex items-center gap-1 bg-pink-500 rounded-full px-1.5 py-0.5 text-[8px] text-white">
                  <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                  Editing...
                </div>
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

      {/* User presence indicators */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#2a1b3e]/80 backdrop-blur-sm rounded-lg border border-white/10 p-2">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-[#2a1b3e] flex items-center justify-center text-white text-xs font-bold">
            AJ
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-500 border-2 border-[#2a1b3e] flex items-center justify-center text-white text-xs font-bold">
            TS
          </div>
          <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-[#2a1b3e] flex items-center justify-center text-white text-xs font-bold">
            MK
          </div>
        </div>
        <div className="text-white text-xs">3 online</div>
      </div>

      {/* Real-time update notification */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#2a1b3e]/90 backdrop-blur-sm rounded-lg border border-white/10 p-2 shadow-lg flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">
          TS
        </div>
        <div className="text-white text-sm">Taylor is editing a card...</div>
      </div>

      {/* Animated sync indicator */}
      <div className="absolute top-4 left-4 bg-[#2a1b3e]/80 backdrop-blur-sm rounded-full border border-white/10 p-1.5 shadow-lg">
        <div className="w-5 h-5 text-pink-400 animate-spin">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent opacity-40"></div>
    </div>
  )
}
