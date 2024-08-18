import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Overview({ totalWallets, totalBalance, totalReleased, totalClaimable }: { totalWallets: number, totalBalance: number, totalReleased: number, totalClaimable: number }) {
  const data = [
    { name: 'Total Wallet IDs', value: totalWallets },
    { name: 'Total Balance', value: totalBalance },
    { name: 'Total Released', value: totalReleased },
    { name: 'Total Claimable', value: totalClaimable },
  ];

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
