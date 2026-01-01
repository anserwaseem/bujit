import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { Transaction } from '@/lib/types';
import { formatAmount } from '@/lib/parser';
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export function Dashboard({ transactions, currencySymbol }: DashboardProps) {
  const analytics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && t.type === 'expense'
    );
    const lastMonth = transactions.filter(
      (t) => new Date(t.date) >= startOfLastMonth && new Date(t.date) <= endOfLastMonth && t.type === 'expense'
    );

    const thisMonthTotal = thisMonth.reduce((sum, t) => sum + t.amount, 0);
    const lastMonthTotal = lastMonth.reduce((sum, t) => sum + t.amount, 0);

    const needsTotal = thisMonth.filter((t) => t.necessity === 'need').reduce((sum, t) => sum + t.amount, 0);
    const wantsTotal = thisMonth.filter((t) => t.necessity === 'want').reduce((sum, t) => sum + t.amount, 0);
    const uncategorized = thisMonth.filter((t) => !t.necessity).reduce((sum, t) => sum + t.amount, 0);

    // By payment mode
    const byMode: Record<string, number> = {};
    thisMonth.forEach((t) => {
      byMode[t.paymentMode] = (byMode[t.paymentMode] || 0) + t.amount;
    });

    // Daily spending for the last 7 days
    const dailyData: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayTotal = transactions
        .filter((t) => new Date(t.date).toDateString() === dateStr && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      dailyData.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        amount: dayTotal,
      });
    }

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthTotal = transactions
        .filter((t) => {
          const d = new Date(t.date);
          return d >= monthStart && d <= monthEnd && t.type === 'expense';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en', { month: 'short' }),
        amount: monthTotal,
      });
    }

    const percentChange = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    return {
      thisMonthTotal,
      lastMonthTotal,
      percentChange,
      needsTotal,
      wantsTotal,
      uncategorized,
      byMode: Object.entries(byMode).map(([name, value]) => ({ name, value })),
      dailyData,
      monthlyTrend,
    };
  }, [transactions]);

  const pieData = [
    { name: 'Needs', value: analytics.needsTotal, color: 'hsl(190, 65%, 50%)' },
    { name: 'Wants', value: analytics.wantsTotal, color: 'hsl(35, 85%, 55%)' },
    { name: 'Other', value: analytics.uncategorized, color: 'hsl(220, 15%, 40%)' },
  ].filter((d) => d.value > 0);

  const modeColors = [
    'hsl(158, 55%, 50%)',
    'hsl(190, 65%, 50%)',
    'hsl(35, 85%, 55%)',
    'hsl(265, 50%, 60%)',
    'hsl(0, 60%, 55%)',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">This Month</span>
          </div>
          <p className="text-2xl font-bold font-mono text-expense">
            {currencySymbol}{formatAmount(analytics.thisMonthTotal)}
          </p>
          <div className={`flex items-center gap-1 text-xs mt-1 ${analytics.percentChange <= 0 ? 'text-income' : 'text-expense'}`}>
            {analytics.percentChange <= 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
            <span>{Math.abs(analytics.percentChange).toFixed(0)}% vs last month</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Last Month</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {currencySymbol}{formatAmount(analytics.lastMonthTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total spent</p>
        </div>
      </div>

      {/* Daily Spending Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Last 7 Days</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.dailyData}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${currencySymbol}${formatAmount(value)}`, 'Spent']}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Needs vs Wants Pie */}
      {pieData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Needs vs Wants</h3>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="font-mono text-sm">
                    {currencySymbol}{formatAmount(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* By Payment Mode */}
      {analytics.byMode.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">By Payment Mode</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byMode} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${currencySymbol}${formatAmount(value)}`, 'Spent']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {analytics.byMode.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={modeColors[index % modeColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">6 Month Trend</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.monthlyTrend}>
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${currencySymbol}${formatAmount(value)}`, 'Spent']}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
