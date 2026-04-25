
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';

const chartData = [
  { month: "Jan", students: 186, incidents: 80 },
  { month: "Feb", students: 305, incidents: 90 },
  { month: "Mar", students: 237, incidents: 60 },
  { month: "Apr", students: 273, incidents: 120 },
  { month: "May", students: 209, incidents: 100 },
  { month: "Jun", students: 214, incidents: 110 },
];

export default function DashboardCharts() {
    return (
         <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
            />
                <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
            />
            <Tooltip
                contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
                color: 'hsl(var(--foreground))'
                }}
                labelStyle={{color: 'hsl(var(--muted-foreground))'}}
                cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
            />
            <Legend wrapperStyle={{fontSize: "0.8rem", color: 'hsl(var(--muted-foreground))'}}/>
            <Bar yAxisId="left" dataKey="students" fill="hsl(var(--chart-1))" name="Sinh viên" radius={[4, 4, 0, 0]} barSize={20} />
            <Line yAxisId="right" type="monotone" dataKey="incidents" strokeWidth={2} stroke="hsl(var(--chart-2))" name="Sự cố" dot={{r: 4, fill: "hsl(var(--chart-2))", stroke: "hsl(var(--background))", strokeWidth: 2 }} activeDot={{r: 6}} />
            </ComposedChart>
        </ResponsiveContainer>
    )
}
