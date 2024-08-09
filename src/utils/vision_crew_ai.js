import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import OpenAI from 'openai';
import readline from 'readline';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

puppeteer.use(StealthPlugin());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const timeout = 8000;

async function image_to_base64(image_file) {
    return await new Promise((resolve, reject) => {
        fs.readFile(image_file, (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject();
                return;
            }
            const base64Data = data.toString('base64');
            const dataURI = `data:image/jpeg;base64,${base64Data}`;
            resolve(dataURI);
        });
    });
}

async function input(text) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(text, (prompt) => {
            rl.close();
            resolve(prompt);
        });
    });
}

async function sleep(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function highlight_links(page) {
    await page.evaluate(() => {
        document.querySelectorAll('[gpt-link-text]').forEach(e => {
            e.removeAttribute("gpt-link-text");
        });
    });

    const elements = await page.$$(
        "a, button, input, textarea, [role=button], [role=treeitem]"
    );

    for (const e of elements) {
        await page.evaluate(e => {
            function isElementVisible(el) {
                if (!el) return false;

                function isStyleVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.width !== '0' &&
                        style.height !== '0' &&
                        style.opacity !== '0' &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden';
                }

                function isElementInViewport(el) {
                    const rect = el.getBoundingClientRect();
                    return (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                }

                if (!isStyleVisible(el)) {
                    return false;
                }

                let parent = el;
                while (parent) {
                    if (!isStyleVisible(parent)) {
                        return false;
                    }
                    parent = parent.parentElement;
                }

                return isElementInViewport(el);
            }

            e.style.border = "1px solid red";

            const position = e.getBoundingClientRect();

            if (position.width > 5 && position.height > 5 && isElementVisible(e)) {
                const link_text = e.textContent.replace(/[^a-zA-Z0-9 ]/g, '');
                e.setAttribute("gpt-link-text", link_text);
            }
        }, e);
    }
}

async function waitForEvent(page, event) {
    return page.evaluate(event => {
        return new Promise(resolve => {
            document.addEventListener(event, function (e) {
                resolve();
            });
        });
    }, event)
}

(async () => {
    console.log("###########################################");
    console.log("# GPT4V-Browsing by Unconventional Coding #");
    console.log("###########################################\n");

    const browser = await puppeteer.launch({
        headless: "new",
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1.75,
    });

    const messages = [
        {
            "role": "system",
            "content": `You are a website crawler. You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot. Don't guess link names.

You can go to a specific URL by answering with the following JSON format:
{"url": "url goes here"}

You can click links on the website by referencing the text inside of the link/button, by answering in the following JSON format:
{"click": "Text in link"}

Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.

In the beginning, go to a direct URL that you think might contain the answer to the user's question. Prefer to go directly to sub-urls like 'https://google.com/search?q=search' if applicable. Prefer to use Google for simple queries. If the user provides a direct URL, go to that one.`,
        }
    ];

    console.log("GPT: How can I assist you today?");
    const prompt = await input("You: ");
    console.log();

    messages.push({
        "role": "user",
        "content": prompt,
    });

    let url;
    let email;
    let password;
    let fullMatch;
    let screenshot_taken = false;

    if (prompt.toLowerCase().includes("url:")) {
        const urlMatch = prompt.match(/URL:([^\s]+)/);
        if (urlMatch) {
            url = urlMatch[1].trim();
        }
        const emailMatch = prompt.match(/Email:([^\s]+)/);
        if (emailMatch) {
            email = emailMatch[1].trim();
        }
        const passwordMatch = prompt.match(/Passowrd:(\S+)/);
        if (passwordMatch) {
            password = passwordMatch[1];
        }
    }

    while (true) {
        if (url) {
            console.log("Crawling " + url);
            await page.goto(url, {
                waitUntil: "domcontentloaded",
            });

            if (email && password) {
                console.log("Using credentials: " + email + " / " + password);

                try {
                    await page.waitForSelector('input[type="text"]', { timeout: 60000 });
                    await page.waitForSelector('input[type="password"]', { timeout: 60000 });

                    console.log("Filling in email and password...");
                    await page.type('input[type="text"]', email);
                    await page.type('input[type="password"]', password);

                    console.log("Clicking the login button...");
                    await page.click('button[type="submit"]');
                    await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    console.log("Logged in successfully.");
                } catch (error) {
                    console.error("Error during login:", error);
                }
            }

            await highlight_links(page);

            await Promise.race([
                waitForEvent(page, 'load'),
                sleep(timeout)
            ]);

            await highlight_links(page);

            await page.screenshot({
                path: "screenshot.jpg",
                quality: 100,
            });

            screenshot_taken = true;
            url = null;
        }

        if (screenshot_taken) {
            const base64_image = await image_to_base64("screenshot.jpg");

            messages.push({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": base64_image,
                    },
                    {
                        "type": "text",
                        "text": "Here's the screenshot of the website you are on right now. You can click on links with {\"click\": \"Link text\"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user's question, you can respond normally.",
                    }
                ]
            });

            screenshot_taken = false;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            max_tokens: 1024,
            messages: messages,
        });

        const message = response.choices[0].message;
        const message_text = message.content;

        messages.push({
            "role": "assistant",
            "content": message_text,
        });

        console.log("GPT: " + message_text);

        if (message_text.indexOf('{"click": "') !== -1) {
            let parts = message_text.split('{"click": "');
            parts = parts[1].split('"}');
            const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '');

            console.log("Clicking on " + link_text);

            try {
                const elements = await page.$$('[gpt-link-text]');

                let partial;
                let exact;

                for (const element of elements) {
                    const attributeValue = await element.evaluate(node => node.getAttribute('gpt-link-text'));

                    if (attributeValue.includes(link_text)) {
                        partial = element;
                        console.log(partial)

                    }

                    if (attributeValue === link_text) {
                        exact = element;
                        console.log(exact)

                    }
                }

                if (exact) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }), // Wait for the navigation to complete
                        exact.click()
                    ]);
                } else if (partial) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }), // Wait for the navigation to complete
                        partial.click()
                    ]);
                } else {
                    throw new Error("Can't find link");
                }

                await Promise.race([
                    waitForEvent(page, 'load'),
                    sleep(timeout)
                ]);

                await highlight_links(page);

                await page.screenshot({
                    path: "screenshot.jpg",
                    quality: 100,
                });

                screenshot_taken = true;
            } catch (error) {
                console.log("Failed to click on the link: " + error.message);
            }
        } else if (message_text.indexOf('{"url": "') !== -1) {
            let parts = message_text.split('{"url": "');
            parts = parts[1].split('"}');
            url = parts[0];
        } else {
            break;
        }
    }

    await browser.close();
})();
