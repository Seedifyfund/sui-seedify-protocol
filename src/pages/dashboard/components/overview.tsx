
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import { curveCardinal } from 'd3-shape';

// const cardinal = curveCardinal.tension(0.2);

export function Overview({ totalWallets, totalBalance, totalReleased, totalClaimable }: { totalWallets: number, totalBalance: number, totalReleased: number, totalClaimable: number }) {
  const data = [
    { name: 'Total Wallet IDs', value: totalWallets },
    { name: 'Total Balance', value: totalBalance },
    { name: 'Total Released', value: totalReleased },
    { name: 'Total Claimable', value: totalClaimable },
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart
        width={500}
        height={400}
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
