'use client';

import { useState, useTransition } from 'react';
import { generateBurndownChart } from '@/ai/flows/generate-burndown-chart';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Project, Task } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

type BurndownChartProps = {
  tasks: Task[];
  project: Project;
};

type ChartData = {
  day: string;
  ideal: number;
  actual: number;
};

const chartConfig = {
  ideal: {
    label: 'Ideal',
    color: 'hsl(var(--chart-1))',
  },
  actual: {
    label: 'Actual',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function BurndownChart({ tasks, project }: BurndownChartProps) {
  const [isPending, startTransition] = useTransition();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [summary, setSummary] = useState('');
  const { toast } = useToast();

  const handleGenerateChart = () => {
    startTransition(async () => {
      try {
        const sprintTasks = tasks.map(t => ({
          name: t.title,
          size: t.storyPoints || 0,
          completed: t.status === 'Done',
        }));

        const response = await generateBurndownChart({
          tasks: sprintTasks,
          sprintName: project.name,
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Mock start date: 10 days ago
          endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // Mock end date: 4 days from now
        });
        
        const parsedData = JSON.parse(response.chartData);
        const formattedData: ChartData[] = parsedData.ideal.map((ideal: number, index: number) => ({
            day: `Day ${index + 1}`,
            ideal,
            actual: parsedData.actual[index] ?? null,
        }));
        setChartData(formattedData);
        setSummary(response.summary);

      } catch (error) {
        console.error(error);
        toast({
          title: 'Chart Generation Failed',
          description: 'The AI failed to generate the burndown chart data. Please check your tasks and try again.',
          variant: 'destructive',
        });
      }
    });
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sprint Burndown Chart</CardTitle>
          <CardDescription>
            AI-generated progress tracking for the current sprint.
          </CardDescription>
        </div>
        <Button onClick={handleGenerateChart} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="mr-2 h-4 w-4" />
          )}
          Generate Chart
        </Button>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft', offset: -10 }} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                 <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey="ideal"
                  type="monotone"
                  stroke={chartConfig.ideal.color}
                  fillOpacity={0.1}
                  fill={chartConfig.ideal.color}
                  strokeWidth={2}
                  stackId="a"
                />
                <Area
                  dataKey="actual"
                  type="monotone"
                  stroke={chartConfig.actual.color}
                  fillOpacity={0.3}
                  fill={chartConfig.actual.color}
                  strokeWidth={2}
                  stackId="b"
                />
              </AreaChart>
            </ChartContainer>
            {summary && (
              <div className="mt-4 rounded-lg border bg-card p-4 text-sm text-card-foreground">
                <h4 className="mb-2 font-semibold">AI Summary</h4>
                <p className="text-muted-foreground">{summary}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed">
            <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No chart data available. Click &quot;Generate Chart&quot; to start.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
