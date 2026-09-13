import { useMemo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis } from "recharts";
import { faDigits, jMonthLabel, jShift, todayJ } from "@/lib/format";

/**
 * روند ۶ ماه اخیر — میله‌های دوقلوی درآمد و هزینه.
 * `sumsByJMonth` بر اساس کلید «jy-jm» شمسی مقدار می‌گیرد.
 */
export function TrendChart({
  sumsByJMonth,
}: {
  sumsByJMonth: Map<string, { income: number; expense: number }>;
}) {
  const months = useMemo(() => {
    const now = todayJ();
    let m = { jy: now.jy, jm: now.jm };
    const out: Array<{ jy: number; jm: number }> = [];
    for (let i = 0; i < 6; i++) {
      out.push(m);
      m = jShift(m, -1);
    }
    return out.reverse();
  }, []);

  const data = useMemo(
    () =>
      months.map(({ jy, jm }) => {
        const sums = sumsByJMonth.get(`${jy}-${jm}`) ?? { income: 0, expense: 0 };
        return {
          label: jMonthLabel(jy, jm).split(" ")[0]!,
          income: sums.income,
          expense: sums.expense,
        };
      }),
    [months, sumsByJMonth],
  );

  const config = {
    income: { label: "درآمد", color: "var(--chart-2)" },
    expense: { label: "هزینه", color: "var(--chart-4)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <BarChart data={data} barGap={2}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          reversed
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => v as string}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="tabular-nums">{faDigits(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="income" fill="var(--color-income)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
