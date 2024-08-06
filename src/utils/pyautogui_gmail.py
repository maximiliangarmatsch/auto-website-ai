"""
module to login to google account using bitwarden 
"""
import os
import time
import asyncio
import pyautogui
import Xlib.display
from openai import OpenAI
import undetected_chromedriver as uc
# from selenium.webdriver.chrome.service import Service # For Linux
from webdriver_manager.chrome import ChromeDriverManager
from pyvirtualdisplay.smartdisplay import SmartDisplay
from dotenv import load_dotenv
from src.utils.helper_funtion import check_unread_email, process_unread_emails, process_icon, error_message

load_dotenv()
model = OpenAI()
model.timeout = 10
BITWARDEN_EMAIL = os.getenv("BITWARDEN_EMAIL")
BITWARDEN_PASSWORD = os.getenv("BITWARDEN_PASSWORD")
 
async def login_via_bitwarden():
    try:
        # Create a ChromeOptions object
        chrome_options = uc.ChromeOptions()
        # global chrome_options
        # Add the extension to ChromeOptions
        chrome_options.add_argument('--load-extension=./extensions/bitwarden')
        display = SmartDisplay(visible = 1, size=(1850, 1050))
        display.start()

        #  For Linux add service=Service(ChromeDriverManager().install())
        browser = uc.Chrome(driver_executable_path=ChromeDriverManager().install(), options=chrome_options)
        browser.get('https://accounts.google.com/AccountChooser?service=mail&continue=https://google.com&hl=en')
        browser.maximize_window()
        browser.save_screenshot( '1.png' )

        # mouse moves in SmartDisplay 
        pyautogui._pyautogui_x11._display = Xlib.display.Display(
            os.environ[ 'DISPLAY' ])
        pos = pyautogui.position()
        print(pos)
        time.sleep(2)

        # Locate the extensions icon to click
        cords_image = await process_icon("assets/extension.png", 2)
        if cords_image is None:
            return error_message("Error While click on Extensions Icon", browser, display)
        time.sleep(2)

        # Locate the pin extension to taskbar icon to click
        cords_image_pin = await process_icon("assets/pins.png", 1)
        if cords_image_pin is None:
            return error_message("Error while Pin Bitarden extension.", browser, display)
        time.sleep(2)

        # Locate the Bitwarden extension on the taskbar icon to click
        cords_image_before_login = await process_icon("assets/bitwarden_before_login.png", 2)
        print(cords_image_before_login)
        if cords_image_before_login is None:
            return error_message("Error While Click on Bitwarden.", browser, display)
        time.sleep(2)

        # Locate the Bitwarden email text field icon to click
        cords_image_enter_gmail = await process_icon("assets/enter_gmail.png", 2)
        if cords_image_enter_gmail is not None:
            pyautogui.typewrite(BITWARDEN_EMAIL)
        time.sleep(2)
        
        # Locate the Bitwarden continue icon to click
        cords_image_gmail_continue = await process_icon("assets/gmail_continue.png", 2)
        if cords_image_gmail_continue is not None:
            pyautogui.typewrite(BITWARDEN_PASSWORD)
        time.sleep(2)

        # Locate the Bitwarden master login icon to click
        cords_image_master_password_login = await process_icon("assets/master_password_login.png", 2)
        if cords_image_master_password_login is None:
            return error_message("Error during bitwarden login.", browser, display)
        time.sleep(2)

        # Locate any random position to click
        cords_image_random = await process_icon("assets/gmail_random.png", 5)
        if cords_image_random is None:
            return error_message("Random position icon not found.", browser, display)
        time.sleep(4)

        # Locate the Bitwarden icon to click
        cords_image_bitwarden = await process_icon("assets/bitwardens.png", 2)
        if cords_image_bitwarden is None:
            return error_message("Bitwarden icon not found.", browser, display)
        time.sleep(2)

        # Locate credentials in Bitwarden
        cords_image_gmail = await process_icon("assets/select_asim_gmail.png", 2)
        if cords_image_gmail is None:
            return error_message("Mentioed Gmail not found.", browser, display)
        time.sleep(2)

        # Locate any random position to click
        cords_image_random = await process_icon("assets/signin_random.png", 1)
        if cords_image_random is None:
            return error_message("Signin random icon not found.", browser, display)
        time.sleep(1)

        # Locate the login button to click on it
        cords_center_next = await process_icon("assets/gmail_next.png", 2)
        if cords_center_next is None:
            return error_message("Error while login to google account.", browser, display)
        time.sleep(2)

        # Locate the Bitwarden icon to click
        cords_image_bitwarden = await process_icon("assets/bitwardens.png", 2)
        if cords_image_bitwarden is None:
            return error_message("Bitwarden icon not found.", browser, display)
        time.sleep(2)

        # Locate credentials in Bitwarden
        cords_image_password = await process_icon("assets/select_asim_gmail.png", 2)
        if cords_image_password is None:
            return error_message("Mentioed Gmail not found.", browser, display)
        time.sleep(2)

        # Locate the login button to click on it
        cords_center_next = await process_icon("assets/gmail_next.png", 5)
        if cords_center_next is None:
            return error_message("Error while login to Gmails account.", browser, display)
        time.sleep(5)

        # Locate the Gmail icon on the main page to click on it
        cords_center_next = await process_icon("assets/move_to_inbox.png", 5)
        if cords_center_next is None:
            return error_message("Erro during open gmail inbox.", browser, display)
        time.sleep(5)

        # Check all unread emails 
        unread_emails = check_unread_email(browser)
        if not unread_emails:
            browser.quit ()
            display.stop()
            return "No unread emails"
        else:
            # Process each unread email 
            unread_emails_response = process_unread_emails(browser, unread_emails)
            browser.quit ()
            display.stop()
            return unread_emails_response
    except Exception as e:
        # Take a screenshot after the action
        screenshot = pyautogui.screenshot()
        screenshot.save('error_screenshot.png')
        print("Error during Crawling!{e}")    
        browser.quit ()
        display.stop()     
        return "Something Went Wrong!"   

# print(login_via_bitwarden())
# browser.quit ()
# display.stop()
