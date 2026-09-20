import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')

function App() {
  const [telemetry, setTelemetry] = useState({
    cpu: 0,
    ram: 0,
    activeApp: 'Initializing...',
    windowTitle: 'Awaiting connection stream',
    computer: 'local-node'
  })

  const [timeline, setTimeline] = useState([])
  const [time, setTime] = useState(new Date())
  
  // --- STATES ---
  const [analysis, setAnalysis] = useState(null)
  const [displayedAnalysis, setDisplayedAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDimMode, setIsDimMode] = useState(false)
  const [filterMode, setFilterMode] = useState('all') 

  // Socket Connection
  useEffect(() => {
    socket.on('dashboard_update', (data) => setTelemetry(data))
    socket.on('activity_history', (history) => setTimeline(history))
    socket.on('new_activity', (activity) => {
      setTimeline((prev) => [activity, ...prev].slice(0, 10))
    })
    return () => {
      socket.off('dashboard_update')
      socket.off('activity_history')
      socket.off('new_activity')
    }
  }, [])

  // Clock Timer for Pixel Screensaver
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Typewriter Effect Hook
  useEffect(() => {
    if (!analysis) return;
    let i = 0;
    setDisplayedAnalysis("");
    const interval = setInterval(() => {
      setDisplayedAnalysis(analysis.substring(0, i + 1));
      i++;
      if (i >= analysis.length) clearInterval(interval);
    }, 25); 
    return () => clearInterval(interval);
  }, [analysis]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const runInvestigation = async () => {
    setIsAnalyzing(true)
    setAnalysis(null)
    setDisplayedAnalysis("")
    try {
      const res = await fetch('http://localhost:3000/api/investigate')
      const data = await res.json()
      if (data.analysis) setAnalysis(data.analysis)
      else if (data.error) setAnalysis(`Server Error: ${data.error}`)
      else setAnalysis("Error: Received empty response from AI core.")
    } catch (err) {
      setAnalysis("Network Error: Unable to reach the Node server.")
    }
    setIsAnalyzing(false)
  }

  const filteredTimeline = timeline.filter(log => {
    if (filterMode === 'code') return log.project || log.currentApp.toLowerCase().includes('code');
    if (filterMode === 'focus') return !log.currentApp.toLowerCase().includes('edge') && !log.currentApp.toLowerCase().includes('chrome');
    return true;
  });

  return (
    <>
      {/* PIXEL-INSPIRED SCREENSAVER OVERLAY */}
      <div 
        onClick={() => setIsDimMode(false)}
        className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-all duration-1000 ease-in-out cursor-pointer ${
          isDimMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className={`transform transition-all duration-1000 delay-150 flex flex-col items-center text-center ${
          isDimMode ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
        }`}>
          
          {/* Massive Minimalist Clock */}
          <h1 className="text-[8rem] md:text-[12rem] font-extralight text-zinc-100 leading-none tracking-tighter tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/(AM|PM)/, '').trim()}
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 font-medium mt-2">
            {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>

          {/* "At a Glance" Telemetry Widget */}
          <div key={telemetry.activeApp} className="mt-16 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-lg">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <p className="text-lg text-zinc-500">
                Active Focus: <span className="text-zinc-200 font-medium">{telemetry.activeApp}</span>
              </p>
            </div>
            
            {telemetry.project && (
              <div className="mt-1 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/80">
                <p className="text-sm font-mono text-zinc-400">
                  {telemetry.project} <span className="text-zinc-600">/</span> {telemetry.file || telemetry.windowTitle.substring(0,25)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* PROPERLY POSITIONED WAKE TEXT */}
        <p className="absolute bottom-8 md:bottom-12 text-zinc-700 text-sm font-medium animate-pulse">
          Click anywhere to awaken
        </p>
      </div>

      {/* MAIN DASHBOARD */}
      <div className={`min-h-screen p-6 md:p-12 font-sans bg-zinc-950 selection:bg-indigo-500/30 transition-all duration-1000 ease-in-out origin-center transform-gpu ${
        isDimMode ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100'
      }`}>
        
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Workspace Header */}
          <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-6 border-b border-zinc-800/80">
            <div>
              <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
  <div className="w-3 h-3 rounded-sm bg-indigo-500 animate-pulse"></div>
  TRACE <span className="text-zinc-600 font-light">Workspace</span>
</h1>
              <p className="mt-2 text-sm text-zinc-500 font-medium">
                BEHAVIORAL TELEMETRY • NODE: <span className="font-mono text-zinc-400">{telemetry.computer}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDimMode(true)}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors border bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
              >
                ✧ Zen Screensaver
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-medium text-zinc-400 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Connection Secure
              </div>
            </div>
          </header>

          {/* Top Grid: Vitals & Live Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Vitals */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-6">Hardware Utilization</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">CPU Load</span>
                    <span className="font-mono font-medium text-zinc-200">{telemetry.cpu}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800/50 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-500 rounded-full" style={{ width: `${telemetry.cpu}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Memory</span>
                    <span className="font-mono font-medium text-zinc-200">{telemetry.ram}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800/50 overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-500 rounded-full" style={{ width: `${telemetry.ram}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Surveillance */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-6">Live Process Focus</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Application</p>
                  <p className="text-2xl font-semibold text-zinc-100">{telemetry.activeApp}</p>
                </div>
                
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3">
                  <p className="text-xs text-zinc-600 mb-1">Window Title</p>
                  <p className="text-sm font-mono text-zinc-300 truncate" title={telemetry.windowTitle}>
                    {telemetry.windowTitle}
                  </p>
                </div>
              </div>

              {telemetry.project && (
                <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center gap-3">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Active Repository:</span>
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-sm">
                    {telemetry.project}
                  </span>
                  {telemetry.file && (
                    <>
                      <span className="text-zinc-700">/</span>
                      <span className="text-xs font-mono text-cyan-400">{telemetry.file}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI Investigator Panel */}
          <div className="bg-zinc-900/40 border border-indigo-500/20 rounded-2xl p-6 shadow-[0_0_15px_rgba(99,102,241,0.05)] flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 mb-2">
                <span className="text-indigo-400 animate-pulse">✧</span> Behavioral Investigator
              </h2>
              <div className="text-sm text-zinc-400 leading-relaxed min-h-[40px] flex items-center">
                {isAnalyzing ? (
                  <span className="text-indigo-300 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Analyzing workflow patterns...
                  </span>
                ) : displayedAnalysis ? (
                  <span className="text-indigo-200">
                    {displayedAnalysis}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle"></span>
                  </span>
                ) : (
                  "Awaiting command to evaluate your current focus and context switching patterns."
                )}
              </div>
            </div>
            
            <button 
              onClick={runInvestigation} 
              disabled={isAnalyzing}
              className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Run Analysis
            </button>
          </div>

          {/* Activity Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-sm font-semibold text-zinc-100">Recent Context Switches</h2>
              
              <div className="flex gap-2">
                <button onClick={() => setFilterMode('all')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterMode === 'all' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}>All</button>
                <button onClick={() => setFilterMode('code')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterMode === 'code' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}>Code Only</button>
                <button onClick={() => setFilterMode('focus')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterMode === 'focus' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}>Hide Browsers</button>
              </div>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm">
              <div className="relative pl-6 border-l border-zinc-800 ml-2 space-y-6">
                {filteredTimeline.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-2">No logs match the current filter...</p>
                ) : (
                  filteredTimeline.map((log, index) => (
                    <div key={index} className="relative group">
                      <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-zinc-950 border-[2px] border-zinc-700 group-hover:border-indigo-400 transition-colors"></div>
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <span className="font-mono text-xs text-zinc-500 min-w-[60px]">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          <div className="flex items-center gap-2.5 text-sm flex-wrap">
                            <span className="font-medium text-zinc-300 bg-zinc-800/50 px-2.5 py-1 rounded-md border border-zinc-700/50">
                              {log.previousApp}
                            </span>
                            <span className="text-zinc-600">→</span>
                            <span className="font-medium text-zinc-100 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700 shadow-sm flex items-center gap-2">
                              {log.currentApp}
                              {log.project && (
                                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                  {log.project}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Duration:</span>
                          <span className="font-mono text-sm font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {formatDuration(log.durationSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App