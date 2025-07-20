from PIL import Image
import matplotlib.pyplot as plt
import pyautogui
import pygetwindow as gw
import subprocess



class Core : 
    @staticmethod
    def to_excel_col_name(n):
        """Converts a 1-based integer to an Excel-style column name (e.g., 1 -> A, 27 -> AA)."""
        name = ""
        while n > 0:
            n, remainder = divmod(n - 1, 26)
            name = chr(ord('A') + remainder) + name
        return name

    @staticmethod
    def screenshot_overwrite():
        pyautogui.screenshot("screenshot.png")
        
    @staticmethod
    def get_screenshot():
        Core.screenshot_overwrite()
        return Image.open("./screenshot.png")

    @staticmethod
    def type(text):
        pyautogui.typewrite(text)

    @staticmethod
    def left_click():
        pyautogui.click(button='left')
        
    @staticmethod
    def right_click():
        pyautogui.click(button='right')
        
    @staticmethod
    def move_to(x: int, y: int):    
        pyautogui.moveTo(x, y, duration=0.1)
        
    @staticmethod
    def hotkey_fn_down(*key: str) -> None:
        # Expects a sequence of strings, e.g. 'ctrl', 'c'
        pyautogui.hotkey(*key)

    @staticmethod
    def press_button(button: str) -> None:
        pyautogui.press(button)
        
    @staticmethod
    def move_to_and_left_click(x: int, y: int):
        Core.move_to(x, y)
        Core.left_click()
        
    @staticmethod
    def move_to_and_right_click(x: int, y: int):
        Core.move_to(x, y)
        Core.right_click()


    @staticmethod
    def get_screen_size():
        #width, height
        return pyautogui.size()
    
    @staticmethod
    def switch_context_window(window_title: str):
        try:
            window = gw.getWindowsWithTitle(window_title)[0]
        except IndexError:
            raise Exception(f"Window with title '{window_title}' not found.")

        if window.isMinimized:
            window.restore()

        # A trick to forcefully bring the window to the foreground
        window.minimize()
        window.restore()
        
        window.activate()

    @staticmethod
    def visit_website(url: str):
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        subprocess.Popen([chrome_path, url])

    @staticmethod
    def get_all_window_titles():
        return gw.getAllTitles()
