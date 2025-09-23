'use server';

/**
 * @fileOverview Generates a burndown chart using AI to track sprint progress.
 *
 * - generateBurndownChart - A function that generates the burndown chart data.
 * - GenerateBurndownChartInput - The input type for the generateBurndownChart function.
 * - GenerateBurndownChartOutput - The return type for the generateBurndownChart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBurndownChartInputSchema = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().describe('Name of the task'),
        size: z.number().describe('Size of the task in story points'),
        completed: z.boolean().describe('Whether the task is completed'),
      })
    )
    .describe('Array of tasks in the sprint'),
  sprintName: z.string().describe('The name of the sprint'),
  startDate: z.string().describe('The start date of the sprint in ISO format'),
  endDate: z.string().describe('The end date of the sprint in ISO format'),
});

export type GenerateBurndownChartInput = z.infer<typeof GenerateBurndownChartInputSchema>;

const GenerateBurndownChartOutputSchema = z.object({
  chartData: z.string().describe('JSON string of the burndown chart data to be rendered.'),
  summary: z.string().describe('A short summary of the sprint progress.'),
});

export type GenerateBurndownChartOutput = z.infer<typeof GenerateBurndownChartOutputSchema>;

export async function generateBurndownChart(input: GenerateBurndownChartInput): Promise<GenerateBurndownChartOutput> {
  return generateBurndownChartFlow(input);
}

const generateBurndownChartPrompt = ai.definePrompt({
  name: 'generateBurndownChartPrompt',
  input: {schema: GenerateBurndownChartInputSchema},
  output: {schema: GenerateBurndownChartOutputSchema},
  prompt: `You are an AI project management assistant that helps visualize sprint progress.

  Given the following tasks, sprint details, and dates, generate the data for a burndown chart in JSON format.
  The JSON should have two keys:
  1.  "ideal": an array of numbers representing the ideal burndown line, starting from the total story points and ending at 0.
  2. "actual": an array of numbers representing the actual burndown, reflecting completed tasks over time.

  Tasks: {{{JSON.stringify(tasks)}}}
  Sprint Name: {{{sprintName}}}
  Start Date: {{{startDate}}}
  End Date: {{{endDate}}}

  Also, write a short summary of the sprint progress, highlighting any potential delays or successes.
  Make sure to return a JSON string.
  `,
});

const generateBurndownChartFlow = ai.defineFlow(
  {
    name: 'generateBurndownChartFlow',
    inputSchema: GenerateBurndownChartInputSchema,
    outputSchema: GenerateBurndownChartOutputSchema,
  },
  async input => {
    const {output} = await generateBurndownChartPrompt(input);
    return output!;
  }
);
