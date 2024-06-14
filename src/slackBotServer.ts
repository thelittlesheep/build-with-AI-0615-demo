import {App, MessageEvent, NextFn} from "@slack/bolt";
import {runFlow} from "@genkit-ai/flow";
import {addCalendarEventFlow, JsonObjectToString} from "./index";
import {performance} from 'node:perf_hooks';

export async function startSlackBoltServer() {
    const app = new App({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        token: process.env.SLACK_BOT_TOKEN,
    });

    async function noBotMessages({message, next}: { message: MessageEvent, next: NextFn }): Promise<void> {
        if (!message.subtype || message.subtype !== 'bot_message') {
            await next();
        }
    }

    app.message(noBotMessages, async ({event, say}) => {
        performance.mark('start');
        if (event.subtype === undefined) {
            const {isContainMeetingInfo, eventDetail} = await runFlow(addCalendarEventFlow, event.text);
            performance.mark('end');
            const measure = performance.measure('measure fn', 'start', 'end');
            const executionTime = measure.duration
            if (isContainMeetingInfo) {
                await say(`<@${event.user}>, your message looks like an event message, ${JsonObjectToString(eventDetail)}, execution time: ${executionTime}ms`);
            } else {
                await say(`<@${event.user}>, your message doesn't look like an event message, execution time: ${executionTime}ms`);
            }
        }
    });

    const serverPort = process.env.SLACK_BOLT_SERVER_PORT || 9000;
    await app.start(serverPort);

    console.log(`⚡️ Bolt app is running on port ${serverPort}!`);
}
