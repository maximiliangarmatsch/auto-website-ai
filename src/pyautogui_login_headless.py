"""
module to login to google account using bitwarden in headless mode.
"""
import os
import time
import pyautogui
import Xlib.display
from pyvirtualdisplay.smartdisplay import SmartDisplay
from dotenv import load_dotenv
import undetected_chromedriver as uc
from webdriver_manager.chrome import ChromeDriverManager
load_dotenv()

BITWARDEN_EMAIL = os.getenv("BITWARDEN_EMAIL")
BITWARDEN_PASSWORD = os.getenv("BITWARDEN_PASSWORD")

# Create a ChromeOptions object
chrome_options = uc.ChromeOptions()

# Add the extension to ChromeOptions
chrome_options.add_argument('--load-extension=./extensions/bitwarden')
display = SmartDisplay(visible = 0, size=(1850, 1050))
display.start()

browser = uc.Chrome(driver_executable_path=ChromeDriverManager().install(), options=chrome_options)
browser.get('https://accounts.google.com/AccountChooser?service=mail&continue=https://google.com&hl=en')
browser.maximize_window()

# mouse moves in SmartDisplay 
pyautogui._pyautogui_x11._display = Xlib.display.Display(
     os.environ[ 'DISPLAY' ])
def detect_icon(icon_path: str):
    """
    Method take icon image path as input and detect it on browser to get its coordinates.

    Parameters
    ----------
    icon_path: str
        icon image path.

    Return
    ------
    None
    """
    image_coordinates = pyautogui.locateOnScreen(icon_path, confidence = 0.7)
    image_center_coordinates = pyautogui.center(image_coordinates)
    pyautogui.moveTo(image_center_coordinates[0], image_center_coordinates[1], 1)
    pyautogui.click(image_center_coordinates[0], image_center_coordinates[1])
    return image_coordinates

def login_via_bitwarden():
    """
    login_via_bitwarden method will to the specific url and step by step perfomr action to login to make.com via bitwarden.

    Parameters
    ----------
    Nooe

    Return
    ------
    None
    """
    try:
        pos = pyautogui.position()
        print(pos)
        time.sleep(2)
        
        # Locate the extensions icon to click
        cords_image = detect_icon("assets/extension.png")
        if cords_image is not None:
            time.sleep(2)

        # Locate the pin extension to task bar icon to click
        cords_image_pin = detect_icon("assets/pins.png")
        if cords_image_pin is not None:
            time.sleep(1)

        # Locate the bitwarden extension on task bar icon to click
        cords_image_before_login = detect_icon("assets/bitwarden_before_login.png")
        if cords_image_before_login is not None:
            time.sleep(1)
        
        # Locate the bitwarden email text field icon to click
        cords_image_enter_gmail = detect_icon("assets/enter_gmail.png")
        if cords_image_enter_gmail is not None:
            time.sleep(1)
        pyautogui.typewrite(BITWARDEN_EMAIL)
        
        # Locate the bitwarden continue icon to click
        cords_image_gmail_continue = detect_icon("assets/gmail_continue.png")
        if cords_image_gmail_continue is not None:
            time.sleep(2)

        pyautogui.typewrite(BITWARDEN_PASSWORD)

        # Locate the bitwarden master login icon to click
        cords_image_master_password_login = detect_icon("assets/master_password_login.png")
        if cords_image_master_password_login is not None:
            time.sleep(5)

        # Locate the any random position to click
        cords_image_random = detect_icon("assets/gmail_random.png")
        if cords_image_random is not None:
            time.sleep(2)

        # Locate the bitwarden icon to click
        cords_image_bitwarden = detect_icon("assets/bitwardens.png")
        if cords_image_bitwarden is not None:
            time.sleep(2)
        
        # Locate credentials in bitwarden
        cords_image_gmail = detect_icon("assets/select_gmail.png")
        if cords_image_gmail is not None:
            time.sleep(2)

        # Locate the login button to click on it 
        cords_center_next = detect_icon("assets/gmail_next.png")
        if cords_center_next is not None:
            time.sleep(2)

        # Locate the bitwarden icon to click
        cords_image_bitwarden = detect_icon("assets/bitwardens.png")
        if cords_image_bitwarden is not None:
            time.sleep(2)
        
        # Locate credentials in bitwarden
        cords_image_password = detect_icon("assets/select_gmail.png")
        if cords_image_password is not None:
            time.sleep(2)

        # Locate the login button to click on it 
        cords_center_next = detect_icon("assets/gmail_next.png")
        if cords_center_next is not None:
            time.sleep(10)
        # Take a screenshot after the action
        screenshot = pyautogui.screenshot()
        screenshot.save('action_screenshot.png')

    except:
        # Take a screenshot after the action
        screenshot = pyautogui.screenshot()
        screenshot.save('action_screenshot.png')
        print("No Icon image found!")           

login_via_bitwarden()
browser.quit ( )
display.stop()
