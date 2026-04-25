'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting incident resolutions and actions based on historical data.
 *
 * - suggestIncidentResolution - A function that takes incident details as input and returns suggested resolutions and actions.
 * - IncidentSuggestionInput - The input type for the suggestIncidentResolution function.
 * - IncidentSuggestionOutput - The return type for the suggestIncidentResolution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IncidentSuggestionInputSchema = z.object({
  incidentDescription: z
    .string()
    .describe('A detailed description of the reported incident.'),
  historicalData: z
    .string()
    .optional()
    .describe('Historical data of past incidents and their resolutions.'),
});

export type IncidentSuggestionInput = z.infer<typeof IncidentSuggestionInputSchema>;

const IncidentSuggestionOutputSchema = z.object({
  suggestedResolution: z
    .string()
    .describe('A suggested resolution for the reported incident.'),
  suggestedActions: z
    .string()
    .describe('A list of suggested actions to take for the reported incident.'),
  reasoning: z
    .string()
    .describe('The AI reasoning behind the suggested resolution and actions.'),
});

export type IncidentSuggestionOutput = z.infer<typeof IncidentSuggestionOutputSchema>;

export async function suggestIncidentResolution(
  input: IncidentSuggestionInput
): Promise<IncidentSuggestionOutput> {
  return incidentSuggestionEngineFlow(input);
}

const incidentSuggestionEnginePrompt = ai.definePrompt({
  name: 'incidentSuggestionEnginePrompt',
  input: {schema: IncidentSuggestionInputSchema},
  output: {schema: IncidentSuggestionOutputSchema},
  prompt: `You are an AI assistant designed to suggest resolutions and actions for reported campus incidents.

  Based on the incident description and historical data, provide a suggested resolution, a list of suggested actions, and the reasoning behind your suggestions.

  Incident Description: {{{incidentDescription}}}
  Historical Data: {{{historicalData}}}

  Consider the following when generating your response:
  - Effectiveness: Prioritize resolutions and actions that have been effective in similar past cases.
  - Consistency: Ensure that the suggestions align with campus policies and procedures.
  - Fairness: Promote equitable treatment and avoid biased outcomes.
  - Safety: Prioritize the safety and well-being of all individuals involved.

  Output the suggested resolution, actions, and reasoning in a clear and concise manner.
  `,
});

const incidentSuggestionEngineFlow = ai.defineFlow(
  {
    name: 'incidentSuggestionEngineFlow',
    inputSchema: IncidentSuggestionInputSchema,
    outputSchema: IncidentSuggestionOutputSchema,
  },
  async input => {
    const {output} = await incidentSuggestionEnginePrompt(input);
    return output!;
  }
);
