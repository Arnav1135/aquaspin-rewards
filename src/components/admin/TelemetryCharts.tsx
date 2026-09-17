import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';

// Mock data generator for telemetry
const generateData = () => {
  const now = new Date();
  return Array.from({ length: 20 }).map((_, i) => ({
    time: new Date(now.getTime() - (19 - i) * 1000).toLocaleTimeString([], { second: '2-digit' }),
    fps: 40 + Math.random() * 20, // 40-60 FPS
    errors: Math.floor(Math.random() * 3), // 0-2 errors
  }));
};

export function TelemetryCharts() {
  const [data, setData] = useState(generateData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData(current => {
        const newData = [...current.slice(1)];
        const last = current[current.length - 1];
        
        // Add occasional spikes
        const isSpike = Math.random() > 0.9;
        const fps = isSpike ? 15 + Math.random() * 10 : 40 + Math.random() * 20;
        const errors = isSpike ? Math.floor(Math.random() * 10) + 3 : Math.floor(Math.random() * 3);

        newData.push({
          time: new Date().toLocaleTimeString([], { second: '2-digit' }),
          fps,
          errors
        });
        
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* FPS Chart */}
      <div className="p-8 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl relative">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="text-emerald-500"/> Live Framerate (Global Avg)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" stroke="#666" fontSize={12} tickMargin={10} />
              <YAxis stroke="#666" fontSize={12} domain={[0, 60]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line 
                type="monotone" 
                dataKey="fps" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Errors Chart */}
      <div className="p-8 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl relative">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <AlertCircle className="text-red-500"/> Error Rate (Exceptions/sec)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" stroke="#666" fontSize={12} tickMargin={10} />
              <YAxis stroke="#666" fontSize={12} domain={[0, 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ color: '#ef4444' }}
              />
              <Line 
                type="stepAfter" 
                dataKey="errors" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
