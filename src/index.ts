import { getAccessToken } from './goauth';
import { chunkArray, sleep } from './utils';
import { createTwoFilesPatch, diffLines } from 'diff';

const DEBUG = false;
const COOLDOWN_TIME = 5000;

async function run(env: any, checkPoint: boolean = false) {
    const token = await getAccessToken(env);
    const docId = env.DOC_ID;
    const webhook = env.DISCORD_WEBHOOK;

    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        console.error("Failed to fetch doc:", await res.text());
        return "ERROR";
    }

    const data: any = await res.json();
    const docTitle:string = data.title;
    const currentText: string = data.body.content
        .map((e: any) => e.paragraph?.elements?.map((el: { textRun: { content: any; }; }) => el.textRun?.content || "").join("") || "")
        .join("");

    const now = new Date().toISOString();
    const lastText = await env.DOC_CACHE.get("last");
    const lastNow = await env.DOC_CACHE.get("lastTime");

    const diff = diffLines(lastText, currentText);

    var diffFileContent = `${docTitle}\n`;
    var diffContentHtml = `<html><head><title> Diff check for GDOC:${docId} at ${now}</title> <meta content="text/html; charset=utf-8" http-equiv="content-type"> </head><body><div><span>`;
    diffContentHtml += `<p> ----------------------------------------------------- </p>`;
    diffContentHtml += `<p> Document title: <b> ${docTitle} </b> </p>`;
    diffContentHtml += `<p style="color: grey;"> Document ID: <i> ${docId} </i> </p>`;
    diffContentHtml += `<p style="color: yellow;"> <i> Last CheckTime: ${lastNow} </i> </p>`;
    diffContentHtml += `<p style="color: blue;"> <i> Current CheckTime: ${now} </i> </p>`;
    diffContentHtml += `<p> ----------------------------------------------------- </p>`;
    diffContentHtml += `<p> Legends: <a style="color: grey;"> unchanged </a> <a style="color: green;"> added </a> <a style="color: red;"> removed </a> </p>`;
    diffContentHtml += `<p> ----------------------------------------------------- </p>`;
    diff.forEach((part: any) => {
        let style = part.added ? `"color: green;"` :
            part.removed ? `"color: red";` : `"color: grey;"`;
        let annotate = part.added ? `+ ` :
            part.removed ? `- ` : `  `;
        let paragraph = part.value.split("\n");
        paragraph.forEach((p: string) => {
            let text = `<p style=${style}> ${p} </p>\n`;
            diffContentHtml += text;
            diffFileContent += `${annotate} ${p}\n`;
        })
    })
    diffContentHtml += "</span></div></body></html>"

    // const patchFileContent = createTwoFilesPatch("lastDocument.txt", "currentDocument.txt", lastText, currentText);

    const boundary = "----WebKitFormBoundary" + Math.random().toString(16).slice(2);
    // const body = `--${boundary}\rContent-Disposition: form-data; name="payload_json"\r\r${JSON.stringify({ content: `📄 Google Doc updated at ${now}` })}\r--${boundary}\rContent-Disposition: form-data; name="file"; filename="update.patch"\rContent-Type: text/plain\r\r${patchFileContent}\r--${boundary}--`;
    const body = `--${boundary}\rContent-Disposition: form-data; name="payload_json"\r\r${JSON.stringify({ content: `📄 Google Doc updated at ${now}` })}\r--${boundary}\rContent-Disposition: form-data; name="file"; filename="update.diff"\rContent-Type: text/plain\r\r${diffFileContent}\r--${boundary}--`;

    if (checkPoint) {
        // send request
        var response_code = -1;
        var tries = 3;
        while (response_code !== 200 && tries > 0) {
            var response = await fetch(env.DISCORD_WEBHOOK, {
                method: "POST",
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`
                },
                body
            });
            if (response.status == 429) {
                const timeout = Number(response.headers.get('Retry-After'));
                console.warn(`Rate limit (retry after ${timeout}), retry in ${timeout + 10}`);
                await sleep(timeout + 10);
            }
            response_code = response.status;
            tries--;
            if (tries <= 0) {
                console.error(response_code);
            }
            await env.DOC_CACHE.put("last", currentText);
            await env.DOC_CACHE.put("lastTime", now);
        }
    }
    return diffContentHtml;
}

export default {
    async fetch(request: any, env: any, ctx: any) {
        const result = await run(env);
        const http_headers = {
            "Content-Type": "text/html"
        };
        return new Response(result, {
            status: 200,
            statusText: "Run success",
            headers: new Headers(http_headers)
        });
    },
    async scheduled(event: any, env: any, ctx: any) {
        const result = await run(env, true);
    }
}
