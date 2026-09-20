import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

// Replace with your actual Ngrok HTTPS link
const API_URL = "https://habitable-revenue-copy.ngrok-free.dev"

const socket = io(API_URL, {
  extraHeaders: {
    "ngrok-skip-browser-warning": "true" // Bypasses the free-tier interstitial page
  }
});

function App() {
  const [telemetry, setTelemetry] = useState({
    cpu: 0,
    ram: 0,
    activeApp: 'Initializing...',
    windowTitle: 'Waiting for the connection',
    computer: 'local-node'
  })

  const [timeline, setTimeline] = useState([])
  const [time, setTime] = useState(new Date())
  const [connected, setConnected] = useState(socket.connected)

  const [analysis, setAnalysis] = useState(null)
  const [displayedAnalysis, setDisplayedAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDimMode, setIsDimMode] = useState(false)
  const [filterMode, setFilterMode] = useState('all')

  // Socket connection
  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('dashboard_update', (data) => setTelemetry(data))
    socket.on('activity_history', (history) => setTimeline(history))
    socket.on('new_activity', (activity) => {
      setTimeline((prev) => [activity, ...prev].slice(0, 10))
    })
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('dashboard_update')
      socket.off('activity_history')
      socket.off('new_activity')
    }
  }, [])

  // Clock for the screensaver
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Typewriter effect
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
      const res = await fetch(`${API_URL}/api/investigate`, {
        headers: { "ngrok-skip-browser-warning": "true" }
      })
      const data = await res.json()
      if (data.analysis) setAnalysis(data.analysis)
      else if (data.error) setAnalysis(`Server error: ${data.error}`)
      else setAnalysis("The analysis came back empty. Try again in a moment.")
    } catch (err) {
      setAnalysis("Couldn't reach the server. Check that it's running and the tunnel is up.")
    }
    setIsAnalyzing(false)
  }

  const filteredTimeline = timeline.filter(log => {
    if (filterMode === 'code') return log.project || log.currentApp.toLowerCase().includes('code');
    if (filterMode === 'focus') return !log.currentApp.toLowerCase().includes('edge') && !log.currentApp.toLowerCase().includes('chrome');
    return true;
  });

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'code', label: 'Code only' },
    { id: 'focus', label: 'Hide browsers' },
  ]

  return (
    <>
      {/* SCREENSAVER */}
      <div
        onClick={() => setIsDimMode(false)}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out cursor-pointer bg-[var(--night)] ${
          isDimMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className={`transform transition-all duration-1000 delay-150 flex flex-col items-center text-center ${
          isDimMode ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
        }`}>

          <h1 className="f-serif text-[8rem] md:text-[13rem] font-extralight text-[var(--night-text)] leading-none tracking-tight tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/(AM|PM)/, '').trim()}
          </h1>
          <p className="f-serif italic text-xl md:text-2xl text-[var(--night-muted)] mt-3">
            {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          <div key={telemetry.activeApp} className="mt-16 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
              <p className="text-lg text-[var(--night-muted)]">
                Focused on <span className="text-[var(--night-text)] font-medium">{telemetry.activeApp}</span>
              </p>
            </div>

            {telemetry.project && (
              <p className="f-mono text-sm text-[var(--night-muted)] mt-1">
                {telemetry.project} <span className="opacity-50">/</span> {telemetry.file || telemetry.windowTitle.substring(0, 25)}
              </p>
            )}
          </div>
        </div>

        <p className="absolute bottom-8 md:bottom-12 text-[var(--night-muted)] opacity-60 text-sm">
          Click anywhere to return
        </p>
      </div>

      {/* MAIN DASHBOARD */}
      <div className={`min-h-screen p-6 md:p-12 bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent-soft)] transition-all duration-1000 ease-in-out origin-center transform-gpu ${
        isDimMode ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100'
      }`}>

        <div className="max-w-5xl mx-auto space-y-10">

          {/* Header */}
          <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-5 pb-8 border-b border-[var(--border)]">
            <div>
              <h1 className="f-serif text-5xl font-normal tracking-tight text-[var(--text)]">
                Trace workspace
              </h1>
              <p className="mt-2 text-[15px] text-[var(--muted)]">
                Behavioral telemetry from <span className="f-mono text-[13px] text-[var(--text)]">{telemetry.computer}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDimMode(true)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--faint)]"
              >
                Zen mode
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--panel)] border border-[var(--border)] rounded-full text-sm text-[var(--muted)]">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--sage)] animate-pulse' : 'bg-[var(--faint)]'}`}></span>
                {connected ? 'Live' : 'Reconnecting'}
              </div>
            </div>
          </header>

          {/* Vitals and live focus */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="card p-7 flex flex-col justify-between">
              <h2 className="f-serif text-xl text-[var(--text)] mb-6">Hardware</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--muted)]">CPU</span>
                    <span className="f-mono text-[var(--text)]">{telemetry.cpu}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg)] rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--accent)] h-full transition-all duration-700 rounded-full" style={{ width: `${telemetry.cpu}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--muted)]">Memory</span>
                    <span className="f-mono text-[var(--text)]">{telemetry.ram}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg)] rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--sage)] h-full transition-all duration-700 rounded-full" style={{ width: `${telemetry.ram}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-7 lg:col-span-2 flex flex-col justify-between">
              <h2 className="f-serif text-xl text-[var(--text)] mb-6">Right now</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <p className="text-sm text-[var(--muted)] mb-1">Application</p>
                  <p className="f-serif text-4xl text-[var(--text)] leading-tight">{telemetry.activeApp}</p>
                </div>

                <div className="bg-[var(--bg)] rounded-xl p-4">
                  <p className="text-xs text-[var(--muted)] mb-1">Window title</p>
                  <p className="f-mono text-[13px] text-[var(--text)] truncate" title={telemetry.windowTitle}>
                    {telemetry.windowTitle}
                  </p>
                </div>
              </div>

              {telemetry.project && (
                <div className="mt-6 pt-5 border-t border-[var(--border)] flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-[var(--muted)]">Repository</span>
                  <span className="f-mono text-xs text-[var(--accent-text)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-md">
                    {telemetry.project}
                  </span>
                  {telemetry.file && (
                    <>
                      <span className="text-[var(--faint)]">/</span>
                      <span className="f-mono text-xs text-[var(--sage)]">{telemetry.file}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Investigator: the one expressive moment */}
          <div className="card p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="flex-1">
              <h2 className="f-serif text-xl text-[var(--text)] flex items-center gap-2.5 mb-3">
                <span className="text-[var(--accent)] text-2xl leading-none">✻</span>
                Behavioral investigator
              </h2>
              <div className="f-serif text-xl leading-relaxed min-h-[56px] flex items-center max-w-[60ch]">
                {isAnalyzing ? (
                  <span className="text-[var(--muted)] italic flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></span>
                    Reading your workflow patterns...
                  </span>
                ) : displayedAnalysis ? (
                  <span className="text-[var(--text)]">
                    {displayedAnalysis}
                    <span className="inline-block w-0.5 h-5 ml-1 bg-[var(--accent)] animate-pulse align-middle"></span>
                  </span>
                ) : (
                  <span className="text-[var(--muted)]">
                    Run an analysis to see how your focus and context switching look today.
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={runInvestigation}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-text)] text-[#fbf7ef] rounded-full text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run analysis
            </button>
          </div>

          {/* Timeline */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 px-1">
              <h2 className="f-serif text-2xl text-[var(--text)]">Recent context switches</h2>

              <div className="flex gap-2">
                {filters.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterMode(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                      filterMode === f.id
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-medium'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-7">
              <div className="relative pl-6 border-l border-[var(--border)] ml-2 space-y-7">
                {filteredTimeline.length === 0 ? (
                  <p className="f-serif italic text-[var(--muted)] text-lg py-2">Nothing here yet for this filter.</p>
                ) : (
                  filteredTimeline.map((log, index) => (
                    <div key={index} className="relative group">
                      <div className="absolute -left-[30px] top-2 w-3 h-3 rounded-full bg-[var(--panel)] border-2 border-[var(--faint)] group-hover:border-[var(--accent)] transition-colors"></div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <span className="f-mono text-xs text-[var(--muted)] min-w-[60px]">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <div className="flex items-center gap-2.5 text-sm flex-wrap">
                            <span className="text-[var(--muted)]">
                              {log.previousApp}
                            </span>
                            <span className="text-[var(--faint)]">to</span>
                            <span className="font-medium text-[var(--text)] flex items-center gap-2">
                              {log.currentApp}
                              {log.project && (
                                <span className="f-mono text-[11px] text-[var(--accent-text)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded">
                                  {log.project}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <span className="f-mono text-sm text-[var(--sage)]">
                          {formatDuration(log.durationSeconds)}
                        </span>
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
