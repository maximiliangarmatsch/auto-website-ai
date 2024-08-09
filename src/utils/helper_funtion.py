"""
helper funtions pyautogui_gmail.py 
"""
import os
import time
import base64
import pyautogui
from openai import OpenAI
from pdfminer.layout import LAParams
import undetected_chromedriver as uc
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from pdfminer.high_level import extract_text
from dotenv import load_dotenv

load_dotenv()
model = OpenAI()
model.timeout = 10
screenshot_path = "screenshot.jpg"
# Create a ChromeOptions object
chrome_options = uc.ChromeOptions()
def detect_icon_with_retry(image_path, attempts = 3, delay = 2):
    for attempt in range(attempts):
        cords = detect_icon(image_path)
        if cords is not None:
            return cords
        print(f"No of attemps: {attempt}")
        time.sleep(delay)
    return None

async def process_icon(image_path, operation_delay):
    cords = detect_icon_with_retry(image_path, attempts = 3, delay = operation_delay)
    if cords is not None:
        return cords
    else:
        return cords
    
def error_message(message, browser, display):
    browser.quit ()
    display.stop() 
    return message

def image_b64(image):
    with open(image, "rb") as f:
        return base64.b64encode(f.read()).decode()
def extract_pdf_text():
    folder_path = "./data"
    files = os.listdir(folder_path)
    for file in files:
        file_path = os.path.join(folder_path, file)
    text = extract_text(file_path, laparams = LAParams())
    return text

def get_email_attachment_summary(pdf_content):
    response = model.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "Your job is to answer the user's question based on the given screenshot of a website. Answer the user as an assistant, but don't tell that the information is from a screenshot or an image."
            },
            {
                "role": "user",
                "content": f"""As a helpful assistant, read the below context carefully and give me the main points of the context in bullet points. Remember that do not include any information which is not relevant to the context.
                CONTEXT: {pdf_content}"""
            }
        ],
        max_tokens=1024,
    )
    print(response)
    email_attatchment_response = response.choices[0].message
    email_attatchment_response = email_attatchment_response.content
    return email_attatchment_response

def get_email_body_summary(screenshot_path):
    base64_image = image_b64(screenshot_path)  
    response = model.chat.completions.create(
        model = "gpt-4o",
        messages = [
            {
                "role": "system",
                "content": "Your job is to answer the user's question based on the given screenshot of a website. Answer the user as an assistant, but don't tell that the information is from a screenshot or an image."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url" : f"data:image/jpeg;base64,{base64_image}"},
                    },
                    {
                        "type": "text",
                        "text": "Here's the screenshot of the email. Just give me the main points of the email in bullet points."
                    }
                ]
            }
        ],
        max_tokens=1024,
    )
    time.sleep(3)
    message = response.choices[0].message
    email_body_response = message.content
        # Delete the screenshot file
    if os.path.exists(screenshot_path):
        os.remove(screenshot_path)
    return email_body_response

def detect_icon(icon_path: str):
    image_coordinates = None
    image_coordinates = pyautogui.locateOnScreen(icon_path, confidence = 0.7)
    if image_coordinates is None:
        return image_coordinates
    image_center_coordinates = pyautogui.center(image_coordinates)
    pyautogui.moveTo(image_center_coordinates[0], image_center_coordinates[1], 1)
    pyautogui.click(image_center_coordinates[0], image_center_coordinates[1])
    return image_center_coordinates

def check_unread_email(browser):
    # Find all unread emails
    unread_emails = browser.find_elements(By.CSS_SELECTOR, 'tr.zA.zE')
    if len(unread_emails) > 1:
        return unread_emails
    else:
        print('No second unread email found')
        return unread_emails
    
def download_email_attachment(browser, link):
    browser.execute_cdp_cmd(
        'Page.setDownloadBehavior',
        {
            'behavior': 'allow',
            'downloadPath': './data'
        }
    )
    try:
        browser.get(link)
        print(f"Navigated to download link: {link}")
    except Exception as error:
        print(f"Failed to Download File: {error}")

def process_unread_emails(browser, unread_emails):
    final_response = ""
    global screenshot_path
    for email in unread_emails:
        email.click()  # Open the email
        time.sleep(3)  # Wait for the email to load
        
        # Take a screenshot after the action
        screenshot = pyautogui.screenshot()
        screenshot.save(screenshot_path)
        email_bullet_points = get_email_body_summary(screenshot_path)
        attachment_email_response = "No Attachment"
        try:
            attachment_element = browser.find_element(By.CSS_SELECTOR, 'a.aQy.aZr.e')
            if attachment_element:
                attachment_url = attachment_element.get_attribute('href')
                attachment_url = attachment_url.replace('disp=inline', 'disp=safe')
                download_email_attachment(browser, attachment_url)
                time.sleep(3)
                pdf_content = extract_pdf_text()
                time.sleep(2)
                attachment_email_response = get_email_attachment_summary(pdf_content)
                time.sleep(5)
            else:
                print('No attachment found')
        except:
            print('No attachment element found')
        
        # Format the email response
        email_response = f"""
**# Email #**

Email Body Summary:
{email_bullet_points}

Attachment Summary:
{attachment_email_response}
"""
        final_response += email_response
        # Delete downlaod file
        folder_path = "./data"
        files = os.listdir(folder_path)
        for file in files:
            file_path = os.path.join(folder_path, file)
            os.remove(file_path)
        # Navigate back to the unread email list
        browser.back()
        time.sleep(2)  # Wait for the list to reload
    return final_response
