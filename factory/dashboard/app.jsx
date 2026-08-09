const { useState, useEffect } = React;

function App() {
  const [health, setHealth] = useState({ status: 'LOADING...', jobsRunning: 0 });
  const [jobs, setJobs] = useState([]);
  const [games, setGames] = useState([]);
  
  const [apiKey, setApiKey] = useState('dev-factory-key');

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/factory/health', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: 'ERROR', jobsRunning: 0 });
      }
    } catch (e) {
      setHealth({ status: 'OFFLINE', jobsRunning: 0 });
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/factory/jobs', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/factory/games', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchJobs();
    fetchGames();
    const interval = setInterval(() => {
      fetchHealth();
      fetchJobs();
      fetchGames();
    }, 2000);
    return () => clearInterval(interval);
  }, [apiKey]);

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Factory Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Autonomous Game Development Factory v2.0</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${health.status === 'OK' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-500'}`}></div>
            <span className="font-mono text-sm">{health.status}</span>
          </div>
          <div className="glass px-4 py-2 rounded-lg">
            <span className="text-slate-400 text-sm mr-2">API Key:</span>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)}
              className="bg-transparent border-b border-slate-600 focus:outline-none focus:border-cyan-400 text-sm text-white w-32"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-xl p-6 border-t-2 border-t-cyan-500">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Active Jobs</h3>
          <div className="text-4xl font-bold text-white">{health.jobsRunning || 0}</div>
        </div>
        <div className="glass rounded-xl p-6 border-t-2 border-t-blue-500">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Games Managed</h3>
          <div className="text-4xl font-bold text-white">{games.length || 0}</div>
        </div>
        <div className="glass rounded-xl p-6 border-t-2 border-t-purple-500">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Jobs Run</h3>
          <div className="text-4xl font-bold text-white">{jobs.length || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Jobs</h2>
            <button className="text-cyan-400 text-sm hover:text-cyan-300">View All</button>
          </div>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No jobs found.</p>
            ) : (
              jobs.slice(0, 5).map(job => (
                <div key={job.id} className="bg-slate-800/50 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-mono text-cyan-300 text-sm">{job.id}</div>
                    <div className="font-semibold">{job.type}</div>
                    <div className="text-slate-400 text-xs mt-1">Game: {job.gameId || 'Global'}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    job.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                    job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                    job.status === 'QUEUED' ? 'bg-slate-500/20 text-slate-400' :
                    'bg-blue-500/20 text-blue-400 animate-pulse'
                  }`}>
                    {job.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Game Inventory</h2>
            <button className="text-cyan-400 text-sm hover:text-cyan-300">New Game</button>
          </div>
          <div className="space-y-4">
            {games.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No games registered.</p>
            ) : (
              games.map(game => (
                <div key={game.id} className="bg-slate-800/50 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg text-white">{game.name}</div>
                    <div className="text-slate-400 text-xs mt-1">ID: {game.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs">Test</button>
                    <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded text-xs">Build</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
