"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { findAllRatingTransactionsByProfile } from "@/server/repositories/rating.repository";

type Transaction = Awaited<ReturnType<typeof findAllRatingTransactionsByProfile>>[number];

interface Props {
  transactions: Transaction[];
}

interface DataPoint {
  date: string;
  rating: number;
  delta: number;
}

interface Category {
  id: string;
  name: string;
  orgName: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: DataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const { rating, delta } = payload[0].payload;
  return (
    <div className="rounded border border-border bg-surface px-3 py-2 text-xs shadow">
      <p className="font-medium text-text-1">{label}</p>
      <p className="text-text-2">Rating: {Math.round(rating)}</p>
      <p className={delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}>
        {(delta >= 0 ? "+" : "") + Number(delta).toFixed(2)}
      </p>
    </div>
  );
}

export default function RatingGraph({ transactions }: Props) {
  // Derive unique categories preserving order of first appearance
  const categoryMap = new Map<string, Category>();
  for (const t of transactions) {
    if (!categoryMap.has(t.ratingCategory.id)) {
      categoryMap.set(t.ratingCategory.id, {
        id: t.ratingCategory.id,
        name: t.ratingCategory.name,
        orgName: t.ratingCategory.organization.name,
      });
    }
  }
  const categories = Array.from(categoryMap.values());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id ?? "",
  );

  if (transactions.length === 0 || categories.length === 0) {
    return <p className="text-sm text-text-2">No rating history yet.</p>;
  }

  const filtered = transactions.filter(
    (t) => t.ratingCategory.id === selectedCategoryId,
  );

  // Group by calendar date, keep end-of-day rating and accumulate net delta (filtered is sorted ASC)
  const byDate = new Map<string, { last: typeof filtered[0]; netDelta: number }>();
  for (const t of filtered) {
    const key = new Date(t.createdAt).toLocaleDateString();
    const existing = byDate.get(key);
    byDate.set(key, { last: t, netDelta: (existing?.netDelta ?? 0) + t.delta });
  }
  const data: DataPoint[] = Array.from(byDate.values()).map(({ last, netDelta }) => ({
    date: new Date(last.createdAt).toLocaleDateString(),
    rating: last.ratingAfter,
    delta: netDelta,
  }));

  return (
    <div className="space-y-3">
      {categories.length > 1 && (
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.orgName}
            </option>
          ))}
        </select>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-3)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-text-3)" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-accent)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
