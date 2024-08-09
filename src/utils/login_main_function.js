/*
website automation main module
*/
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-extra';
import readline from 'readline';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Module Import
import {processAllFiles} from "./pdf_reader.js";
import { checkFolderIsEmpty,  downloadEmailAttachement, imageToBase64,
    sleep, highlightLinks, waitForEvent, readPromptFromFile} from './helper_functions.js';

// Pupeteer stealth for pupeteer plugins
const stealth = StealthPlugin()
stealth.enabledEvasions.delete('iframe.contentWindow')
stealth.enabledEvasions.delete('media.codecs')
puppeteer.use(stealth)

// Extract Text From PDF Variables
const folderPath = "./data";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const timeout = 8000;

// Intialize workflow
export async function main_login(userInput){

    console.log("# Email Automation AI Tool #");
    const browser = await puppeteer.launch({
        headless: "new",
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1.75,
    });
    // Read GPT main prompt from text file
    const main_prompt = await readPromptFromFile('./prompt/main_prompt.txt');
    // Format Prompt 
    const messages = [
        {
            "role": "system",
            "content": main_prompt
        }
    ];

    // Get user input
    const prompt = userInput;
    console.log(prompt);

    // Push user prompt to main Prompt
    messages.push({
        "role": "user",
        "content": prompt,
    });
    //Intialize variables
    let url = process.env.LOGIN_URL;
    let action_take = false
    let download_attachement_file = false
    let email = process.env.EMAIL;
    let phone = process.env.PHONE;
    let password = process.env.PASSWORD;
    let screenshot_taken = false;
    let login_status = false
    let openai_final_response = ""
    let action = ""
    let unread_email = false
    // Get action from User input.
    if (prompt.toLowerCase()) {
        const actionMatch = prompt.match(/Action:(\S+)/);
        if (actionMatch) {
            action = actionMatch[1];
            action_take = true;
        }
    }
    // Start to navigate the requested URL
    while (true) {
        if (url) {
            console.log("Crawling " + url);
            await page.goto(url, {
                waitUntil: "domcontentloaded",
            });
            if (email && password) {
                // console.log("Using credentials: " + email + " / " + password + " / " + phone);
                try {
                    // Wait for the email input and fill it
                    await page.waitForSelector('input[type="email"]', { timeout: 60000 });
                    console.log("Filling in email...");
                    await page.type('input[type="email"]', email);
                    // Click the next button after entering the email
                    const emailNextButtonSelector = '#identifierNext';
                    await page.waitForSelector(emailNextButtonSelector, { timeout: 60000 });
                    console.log("Clicking the email next button...");
                    await page.click(emailNextButtonSelector);
                    // Wait for navigation to the password page
                    await page.waitForNavigation({ waitUntil: 'networkidle0' });
            
                    // Wait for the password input to appear
                    await page.waitForSelector('input[type="password"]', { timeout: 60000 });
                    console.log("Filling in password...");
                    await page.type('input[type="password"]', password);
            
                    // Click the next button after entering the password
                    const passwordNextButtonSelector = '#passwordNext';
                    await page.waitForSelector(passwordNextButtonSelector, { timeout: 60000 });
                    
                    // Ensure the button is visible and enabled
                    const passwordNextButton = await page.$(passwordNextButtonSelector);
                    await page.evaluate(button => button.scrollIntoView(), passwordNextButton);
                    await page.waitForFunction(button => button && !button.disabled, {}, passwordNextButton);
            
                    console.log("Clicking the password next button...");
                    await passwordNextButton.click();
            
                    // Wait for the navigation to complete after logging in
                    await page.waitForNavigation({ waitUntil: 'networkidle0' });

                    // Wait for the 2FA to appear and ensure it's visible
                    const phoneNumberInput = await page.waitForSelector('input[type="tel"]', { timeout: 60000, visible: true });
                    console.log("Filling in Phone number...");
                    await phoneNumberInput.type(phone);

                    // Wait for the "Send" button to appear and ensure it's clickable
                    const sendButtonSelector = 'button[type="button"] span.VfPpkd-vQzf8d';
                    await page.waitForSelector(sendButtonSelector, { visible: true });

                    // Scroll the "Send" button into view
                    await page.evaluate((selector) => {
                        document.querySelector(selector).scrollIntoView();
                    }, sendButtonSelector);

                    // Wait for a short moment to ensure the button is clickable
                    await new Promise(r => setTimeout(r, 500));
                    // Click the "Send" button
                    await page.click(sendButtonSelector);
                    console.log("Clicked the 'Send' button. Waiting for user input...");
                    await page.waitForNavigation({ waitUntil: 'networkidle0' });

                    // Function to prompt user for verification code
                    const askQuestion = (query) => {
                        const rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout,
                        });
                        return new Promise(resolve => rl.question(query, ans => {
                            rl.close();
                            resolve(ans);
                        }));
                    };
                    // Prompt the user to enter the verification code
                    const verificationCode = await askQuestion('Please enter your Verification Code: ');
                    // // Wait for the 2FA to appear and ensure it's visible
                    const verificationNumberInput = await page.waitForSelector('input[type="tel"]', { timeout: 60000, visible: true });
                    console.log("Filling in Verification Code...");
                    await verificationNumberInput.type(verificationCode);

                    // Login to google account and Open Gmail
                    try {
                        // Click the login button
                        await page.click('.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-k8QpJ.VfPpkd-LgbsSe-OWXEXe-dgl2Hf.nCP5yc.AjY5Oe.DuMIQc.LQeN7.BqKGqe.Jskylb.TrZEUc.lw1w4b');               
                        // Wait for navigation
                        await page.waitForNavigation();
                        console.log("Logged in successfully.");

                        // Navigate to Gmail
                        await page.goto('https://mail.google.com/mail/');
                        console.log("Navigated to Gmail.");
                        // Wait for navigation after login
                        await page.waitForNavigation({ waitUntil: 'networkidle2' })

                        // Change login status
                        login_status = true;
                        await highlightLinks(page);
                        await page.screenshot({
                            path: "screenshot_emails.jpg",
                            quality: 100,
                        });
                    } catch (error) {
                        console.log("Login failed or navigation error:", error);
                    }

                    // Check user action is open unread email or other navigation
                    if (action_take){
                        try {
                            // Wait for the unread emails to load (optional increase of timeout)
                            await page.waitForSelector('tr.zA.zE', { visible: true});
                        
                            // Check if the first unread email exists
                            const firstUnreadEmail = await page.$('tr.zA.zE');
                            if (firstUnreadEmail) {
                                await firstUnreadEmail.click({ delay: 100 });
                                unread_email = true;
                            } else {
                                console.log('No Unread email found');
                                unread_email = false;
                            }
                        } catch (error) {
                            if (error.name === 'TimeoutError') {
                                console.log('No Unread email found');
                                download_attachement_file = false;
                                openai_final_response = "No Unread email found"
                                // break the loop
                                break
                            } else {
                                // Handle other potential errors
                                console.error('Error occurred:', error);
                            }
                        }

                        // Check for Email Attachment
                        try{ 
                            // Wait for the email content to load
                            await page.waitForSelector('a.aQy.aZr.e');

                            // Get the URL of the attachment and modify disp parameter to 'safe'
                            const attachmentUrl = await page.evaluate(() => {
                                const anchor = document.querySelector('a.aQy.aZr.e');
                                if (anchor) {
                                    let url = anchor.href;
                                    url = url.replace('disp=inline', 'disp=safe');
                                    return url;
                                }
                                return null;
                            });
                            
                            // Download the email attachment in specified folder or path.
                            downloadEmailAttachement(page, attachmentUrl)

                            // wait for 3 seconds to download the file.
                            await sleep(3000);

                            // check attachment file download or not.
                            (async () => {
                            const folderPath = './data'; // Replace with your actual folder path
                            const isDownloaded = await checkFolderIsEmpty(folderPath);
                            if (isDownloaded) {
                                download_attachement_file = true
                            } else {
                                download_attachement_file = false
                            }
                            })();
                       }
                       catch(error){
                        if (error.name === 'TimeoutError') {
                            console.log('Email attachement not found');
                            download_attachement_file = false;
                        } else {
                            // Handle other potential errors
                            console.error('Error occurred:', error);
                        }
                       }
                    }
                  } 
                
                catch (error) {
                    console.error("Error during login:", error);
                }
            }            
            await highlightLinks(page);

            await Promise.race([
                waitForEvent(page, 'load'),
                sleep(timeout)
            ]);

            await highlightLinks(page);

            await page.screenshot({
                path: "screenshot.jpg",
                quality: 100,
            });

            screenshot_taken = true;
            url = null;
        }
        // LLM Text Based Response
        if (unread_email) {
            const base64_image = await imageToBase64("screenshot.jpg");
            // GPT promtp to response from screenshots.
            messages.push({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": base64_image
                        },
                    },
                    {
                        "type": "text",
                        "text": "Here's the screenshot of the email just Give me the Summary of Email in bullet points.",
                    }
                ]
            });

            const response_screenshot = await openai.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 1024,
                messages: messages,
            });
    
            const message_screenshot = response_screenshot.choices[0].message;
            const message_text_screenshot = message_screenshot.content;
    
            messages.push({
                "role": "assistant",
                "content": message_text_screenshot,
            });
          // Check if the attchement found with Email or not
          let extractedText = "";
          if(download_attachement_file){
            // Extract content from PDF file
            processAllFiles(folderPath)
                .then((pdfContent) => {
                    extractedText = pdfContent;
                    console.log("Extracted PDF Content");
                })
                .catch((error) => {
                    console.error("Error extracting PDF content:", error);
                });
                await sleep(3000)
            }
            // GPT prompt to reponse from PDF
            messages.push({
                "role": "user",
                "content": [ 
                {
                        "type": "text",
                        "text": `As an helpfull assiatnt read the below context carefully and provide the Account summary from given bank statement in bullet points Only. Remember that do not include any information whihc is not relevent to context. If context not given then say Email has no attachment.
                        CONTEXT: ${extractedText}.
                        Example Response:

                        `,
                    }
                ]
            });
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 1024,
                messages: messages,
            });
            const message = response.choices[0].message;
            const message_text = message.content;
            messages.push({
                "role": "assistant",
                "content": message_text,
            });
            // Format output 
            const openai_final_response = `
            **# Email Summary #**
            
            ${message_text_screenshot}
            
            **# Email Attachment Summary #**
            
            ${message_text}
            `;

            // Return reponse data
            return [openai_final_response, page, login_status, browser]
        }
        // LLM Actions Based Response
        else if (screenshot_taken) 
        {
          const base64_image = await imageToBase64("screenshot.jpg");
          // GPT promtp to response from screenshots.
          messages.push({
              "role": "user",
              "content": [
                  {
                      "type": "image_url",
                      "image_url": {
                          "url": base64_image
                      },
                  },
                  {
                      "type": "text",
                      "text": "Here's the screenshot of the website you are on right now. You can click on links with {\"click\": \"Link text\"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user's question, you can respond normally.",
                  }
              ]
          });

          screenshot_taken = false;
      }
      else {
        console.log("No Context OR Action Given")
        return ["No Context OR Action Given", page, login_status, browser]
      }
      const response = await openai.chat.completions.create({
          model: "gpt-4o",
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

      // Check GPT predicted action
      if (message_text.indexOf('{"click": "') !== -1) {
          let parts = message_text.split('{"click": "');
          parts = parts[1].split('"}');
          const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '').toLocaleLowerCase();
          link_text.toLocaleLowerCase()
          console.log("Navigating to link " + link_text);
          // Check GPT suggest any action or not
          try {
            if (link_text!="compose") {
                let navogation_url = `https://mail.google.com/mail/u/0/#${link_text}`
                await page.goto(navogation_url);
                // Wait for navigation
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                console.log("Successful. navigate the page."); 
                //Highlight the href or buttons on new page               
                await highlightLinks(page);

                // Take screenshot of navigated page
                await page.screenshot({
                    path: "screenshot.jpg",
                    quality: 100,
                });
                screenshot_taken = true;
                console.log("Screenshot taken.");
            } 
            else if(link_text=="compose") {
                let current_page_url = page.url()
                let navogation_url = `${current_page_url}?${link_text}=new`
                console.log(navogation_url)
            }
            else {
                throw new Error("Can't find link");
            }
          } catch (error) {
              console.log("Failed to click on the link: " + error.message);
          }
      } 
      else if (message_text.indexOf('{"url": "') !== -1) {
          let parts = message_text.split('{"url": "');
          parts = parts[1].split('"}');
          url = parts[0];
      } else {
        openai_final_response = message_text

        // Return response data
        return [openai_final_response, page, login_status, browser]
      } 
      
    }
    // Return response data.
    return [openai_final_response, page, login_status, browser]
}
