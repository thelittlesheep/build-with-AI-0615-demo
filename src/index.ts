import {generate} from '@genkit-ai/ai';
import {configureGenkit} from '@genkit-ai/core';
import {defineFlow, startFlowsServer} from '@genkit-ai/flow';

import * as z from 'zod';
import {ollama} from 'genkitx-ollama';
import {googleAI} from "@genkit-ai/googleai";
import "dotenv/config";

configureGenkit({
    plugins: [
        ollama({
            models: [{name: 'gemma'}],
            serverAddress: 'http://127.0.0.1:11434', // default ollama local address
        }),
        googleAI({
            apiKey: process.env.GOOGLE_GENAI_API_KEY,
        }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});

export const menuSuggestionFlow = defineFlow(
    {
        name: 'menuSuggestionFlow',
        inputSchema: z.string(),
        outputSchema: z.string(),
    },
    async (subject) => {
        const llmResponse = await generate({
            prompt: `Suggest an item for the menu of a ${subject} themed restaurant`,
            model: 'ollama/gemma',
            config: {
                temperature: 1,
            },
        });

        return llmResponse.text();
    }
);

startFlowsServer();
