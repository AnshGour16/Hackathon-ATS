'use client';

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

interface RadarDataProps {
    data: {
        criterion: string;
        score: number;
        fullMark: number;
    }[];
}

export default function ScoreRadarChart({ data }: RadarDataProps) {
    const maxDomain = Math.max(10, ...data.map(d => Math.max(d.fullMark || 10, d.score || 0)));

    // If we don't have exactly 3-5 criteria, a radar chart might look weird, 
    // but Recharts handles it gracefully.
    return (
        <div className="w-full h-[320px] bg-black/40 rounded-xl border border-primary/20 p-4 shadow-[0_0_30px_rgba(139,92,246,0.1)] relative overflow-hidden">
            {/* Ambient Background Glow inside the chart */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                    <PolarAngleAxis
                        dataKey="criterion"
                        tick={{ fill: '#f8fafc', fontSize: 13, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, maxDomain]}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                    />
                    <Radar
                        name="AI Evaluation"
                        dataKey="score"
                        stroke="#a855f7"
                        strokeWidth={3}
                        fill="url(#scoreGradient)"
                        fillOpacity={1}
                        animationDuration={1500}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(10, 10, 10, 0.95)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#c084fc', fontWeight: 'bold' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
