import time
from internal.advanced_core import AdvancedCore
import sys

#Make sure that current screen is in a reasonable state to start
#Start Function

for i in range(1, 101):
    #Comment: Select Powerpoint and Right Click
    caption = "Selecting Powerpoint and Right Clicking"
    print(caption)
    sys.stdout.flush()
    
    AdvancedCore.left_click_middle_of_screen_and_right_click()
    
    
    #Comment: Click on Save as Picture
    caption = "Clicking on Save as Picture"
    print(caption)
    sys.stdout.flush()
    
    AdvancedCore.first_point_and_click("Save as Picture")
    
    
    #Comment: Save Picture
    caption = "Saving Picture"
    print(caption)
    sys.stdout.flush()
    
    
    time.sleep(1)
    AdvancedCore.type(str(i))
    AdvancedCore.first_point_and_click("Save")
    
    
    
    
    #Comment: Move to next slide
    AdvancedCore.press_button("pagedown")