/*
Helper functions module
*/
import { promises as FS } from 'fs';
import readline from 'readline';
import fs from 'fs';
import { promisify } from 'util';

// Function to Check the file download in specified folder or not.
export async function checkFolderIsEmpty(folderPath) {
    try {
      const files = await FS.readdir(folderPath);
  
      if (files.length === 0) {
        console.log('Attachment not downloaded');
      } else {
        console.log('Attachment downloaded successfully.');
        return true
      }
    } catch (err) {
      console.error(`Error reading directory ${folderPath}:`, err);
      return false;
    }
  }
  
//Function to download the attachment file. 
export async function downloadEmailAttachement(page, link) {
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: './data'
    });
    try {
        return page.evaluate((link) => {
            location.href = link;
        }, link);
    } catch (error) {
        console.error(`Failed to Download File: ${error}`);
    }
  }
  
// function convert image to base64
export async function imageToBase64(image_file) {
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
  
// Function to take input from user
export async function userInput(text) {
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
  
// Function to restrcit the process for defined interval. 
export async function sleep(milliseconds) {
      return new Promise(resolve => {
          setTimeout(resolve, milliseconds);
      });
  }

// Function to highlight the Links or buttons in screenshot and mark border around. 
export async function highlightLinks(page) {
      await page.evaluate(() => {
          document.querySelectorAll('[gpt-link-text]').forEach(e => {
              e.removeAttribute("gpt-link-text");
          });
      });
      const elements = await page.$$(
          "tr, a, button, input, textarea, [role=button], [role=treeitem]"
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
  
// Function wait while openai crawling to a link.
export async function waitForEvent(page, event) {
      return page.evaluate(event => {
          return new Promise(resolve => {
              document.addEventListener(event, function (e) {
                  resolve();
              });
          });
      }, event)
  }


// Function to logout from google account
export async function logoutGmail(page) {
    try {
        // Wait for the logout selector 
        await page.waitForSelector('a.gb_d.gb_ya.gb_z');
        // Get the URL of the logout page
        const logoutUrl = await page.evaluate(() => {
            const anchor = document.querySelector('a.gb_d.gb_ya.gb_z');
            if (anchor) {
                let url = anchor.href;
                return url;
            }
            return null;
        });
        // Navigate to account logout page
        await page.goto(logoutUrl);
        console.log("Navigated to logout page.");
        // Click the logout button
        await page.click('button[name="signout"]');
        console.log("Clicked the logout button.");
        await sleep(20000)
        return true;
    } catch (error) {
        console.error("Logout failed:", error);
        return false;
    }
}

// Promisify the readFile function
const readFileAsync = promisify(fs.readFile);

// Read prompt from .txt file
export async function readPromptFromFile(filePath) {
    try {
        const data = await readFileAsync(filePath, 'utf8');
        return data;
    } catch (error) {
        console.error('Error reading the file:', error);
        throw error;
    }
}

// Take page screenshot
export async function pageScreenShot(page){
    await page.screenshot({
        path: "screenshot.jpg",
        quality: 100,
    });
}