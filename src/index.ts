import {configureGenkit} from '@genkit-ai/core';
import {defineFlow, startFlowsServer} from '@genkit-ai/flow';

import * as z from 'zod';
import {ollama} from 'genkitx-ollama';
import {geminiPro, googleAI} from "@genkit-ai/googleai";
import "dotenv/config";
import {Dotprompt, dotprompt, prompt} from '@genkit-ai/dotprompt';
import {startSlackBoltServer} from "./slackBotServer";

(async () => {
    await startSlackBoltServer();
})();

const localModelName = `${process.env.LOCAL_MODEL_NAME}` || 'gemma'
const remoteModelName = 'googleai/gemini-pro'

const localModelForPrompt = `ollama/${localModelName}`;
const remoteModelForPrompt = remoteModelName;

configureGenkit({
    plugins: [
        ollama({
            models: [
                {
                    name: localModelName,
                    type: 'generate'
                }
            ],
            serverAddress: 'http://127.0.0.1:11434', // default ollama local address
        }),
        googleAI({
            apiKey: process.env.GOOGLE_GENAI_API_KEY,
        }),
        dotprompt()
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});

async function generateStaticResponse(prompt: Dotprompt, input: object, modelName: string): Promise<string> {
    const rawRes = await prompt.generate({
        model: modelName,
        input: input,
    });

    return rawRes.text();
}

type Event = {
    eventName: string;
    time: string;
    date: string;
    location: string;
    content: string;
    needRegistration: boolean;
}

function formatJsonString(modelOutput: string): string {
    return modelOutput.replace(/\\n/g, '').replace(/\\"/g, '"');
}

export function JsonObjectToString(obj: any): string {
    return formatJsonString(JSON.stringify(obj, null, 2));
}

function modelOutPutToJSON<T>(modelOutput: string): T {
    const formattedResponse = formatJsonString(modelOutput);
    let response = ''
    let isValidJSON = false;

    try {
        response = JSON.parse(formattedResponse);
        isValidJSON = true;
    } catch (error) {
    }

    if (!isValidJSON) {
        const regex = /{[^]*}/;
        const match = formattedResponse.match(regex);
        if (match) {
            response = match[0];
        } else {
            console.warn('Invalid JSON:', formattedResponse);
            throw new Error('Invalid JSON');
        }
    }

    return response as T;
}

function cleanUpSlackMessage(text: string): string {
    return text.replace(/:\w+:/g, '');
}

async function getEventDetail(text: string, modelName: string): Promise<Event> {
    const getEventDetailPrompt = await prompt('getEventDetail');

    const input = {
        text: text,
    }

    const responseText = await generateStaticResponse(
        getEventDetailPrompt,
        input,
        modelName
    );
    const response = modelOutPutToJSON<Event>(responseText);

    return response;
}

async function checkIfContainMeetingInfo(text: string, modelName: string): Promise<boolean> {
    const checkIfContainMeetingInfoPrompt = await prompt('checkIfContainMeetingInfo');

    const input = {
        text: text,
    }

    const response = await generateStaticResponse(
        checkIfContainMeetingInfoPrompt,
        input,
        modelName
    );
    const isContainMeetingInfo = response.toLowerCase().trim() === "true";

    return isContainMeetingInfo;
}

export const addCalendarEventFlow = defineFlow({
        name: 'addCalendarEvent',
        inputSchema: z.string(),
        outputSchema: z.object({
            isContainMeetingInfo: z.boolean(),
            eventDetail: z.object({
                eventName: z.string(),
                time: z.string(),
                date: z.string(),
                location: z.string(),
                content: z.string(),
                needRegistration: z.boolean(),
            }),
        })
    },
    async (input: string) => {
        const cleanUpInput = cleanUpSlackMessage(input);
        const isContainMeetingInfo = await checkIfContainMeetingInfo(cleanUpInput, localModelForPrompt);
        if (isContainMeetingInfo) {
            const eventDetail = await getEventDetail(cleanUpInput, localModelForPrompt);
            return {
                isContainMeetingInfo: isContainMeetingInfo,
                eventDetail: eventDetail,
            };
        }

        return {
            isContainMeetingInfo: isContainMeetingInfo,
            eventDetail: {
                eventName: '',
                time: '',
                date: '',
                location: '',
                content: '',
                needRegistration: false,
            },
        };
    }
)

startFlowsServer();
