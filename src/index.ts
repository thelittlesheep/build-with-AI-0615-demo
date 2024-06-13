import {generate} from '@genkit-ai/ai';
import {configureGenkit} from '@genkit-ai/core';
import {defineFlow, startFlowsServer} from '@genkit-ai/flow';

import * as z from 'zod';
import {ollama} from 'genkitx-ollama';
import {geminiPro, googleAI} from "@genkit-ai/googleai";
import "dotenv/config";
import {ModelArgument} from "@genkit-ai/ai/lib/model";

const localModelName = process.env.LOCAL_MODEL_NAME || 'ollama/gemma'

const localModel = `ollama/${localModelName}`
const remoteModel = geminiPro

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
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});

async function generateStaticResponse(text: string, model: ModelArgument): Promise<string> {
    const rawRes = await generate({
        prompt: text,
        model: model,
        config: {
            temperature: 1,
        },
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

function JsonObjectToString(obj: any): string {
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

async function getEventDetail(text: string, model: ModelArgument): Promise<Event> {
    const responseText = await generateStaticResponse(
        `Give me a output of event detail from ${text},` +
        "format will be a JSON, key and value can be determined by the model." +
        "But at least must contain [eventName, time, date, location, location, content, needRegistration] these fields.",
        model
    );
    const response = modelOutPutToJSON<Event>(responseText);

    return response;
}

async function checkIfContainMeetingInfo(text: string, model: ModelArgument): Promise<boolean> {
    const template = `Tell me if this is a message contain meeting or event information,
        it need to contain at least date and time, message: '${text}', 
        return me result in boolean format true of false with lowercase.`;
    const response = await generateStaticResponse(template, model);
    const isContainMeetingInfo = response.toLowerCase().trim() === "true";

    return isContainMeetingInfo;
}

export const addCalendarEventFlow = defineFlow({
        name: 'addCalendarEvent',
        inputSchema: z.string(),
        outputSchema: z.string(),
    },
    async (input: string) => {
        const cleanUpInput = cleanUpSlackMessage(input);
        const isContainMeetingInfo = await checkIfContainMeetingInfo(cleanUpInput, localModel);
        if (isContainMeetingInfo) {
            const eventDetail = await getEventDetail(cleanUpInput, localModel);
            return `Add calendar event ${JsonObjectToString(eventDetail)}`;
        }

        return 'No meeting information found.';
    }
)

startFlowsServer();
