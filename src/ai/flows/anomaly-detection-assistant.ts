'use server';

/**
 * @fileOverview A anomaly detection AI agent.
 *
 * - detectAnomalies - A function that handles the anomaly detection process.
 * - DetectAnomaliesInput - The input type for the detectAnomalies function.
 * - DetectAnomaliesOutput - The return type for the detectAnomalies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectAnomaliesInputSchema = z.object({
  metricType: z
    .enum(['attendance', 'grades', 'other'])
    .describe('The type of metric to analyze for anomalies.'),
  data: z.string().describe('The data to analyze, provided as a string.'),
  description: z
    .string()
    .optional()
    .describe('Optional description of the data.'),
});
export type DetectAnomaliesInput = z.infer<typeof DetectAnomaliesInputSchema>;

const DetectAnomaliesOutputSchema = z.object({
  hasAnomalies: z
    .boolean()
    .describe('Whether or not anomalies were detected in the data.'),
  anomaliesDescription: z
    .string()
    .describe('A description of the anomalies detected.'),
  reasoning: z.string().describe('The reasoning behind the anomaly detection.'),
  suggestions: z
    .string()
    .optional()
    .describe('Suggestions for addressing the detected anomalies.'),
});
export type DetectAnomaliesOutput = z.infer<typeof DetectAnomaliesOutputSchema>;

export async function detectAnomalies(input: DetectAnomaliesInput): Promise<DetectAnomaliesOutput> {
  return detectAnomaliesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectAnomaliesPrompt',
  input: {schema: DetectAnomaliesInputSchema},
  output: {schema: DetectAnomaliesOutputSchema},
  prompt: `You are an AI assistant that specializes in detecting anomalies in campus data.

You will analyze the provided data and determine if there are any anomalies.

Type of metric: {{{metricType}}}
Data: {{{data}}}
Description: {{{description}}}

Based on your analysis, set the hasAnomalies output field appropriately.
Provide a detailed description of any anomalies detected in the anomaliesDescription output field.
Explain your reasoning for detecting or not detecting anomalies in the reasoning output field.
If anomalies are detected, provide suggestions for addressing them in the suggestions output field.
`,
});

const detectAnomaliesFlow = ai.defineFlow(
  {
    name: 'detectAnomaliesFlow',
    inputSchema: DetectAnomaliesInputSchema,
    outputSchema: DetectAnomaliesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
