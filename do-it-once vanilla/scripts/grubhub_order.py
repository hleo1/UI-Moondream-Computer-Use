import time
from internal.advanced_core import AdvancedCore


AdvancedCore.visit_website("https://www.grubhub.com/lets-eat")

time.sleep(2)

AdvancedCore.first_point_and_click("Search Menu")

AdvancedCore.type("Awang")

AdvancedCore.press_button("enter")

time.sleep(3)

AdvancedCore.first_point_and_click("Awang Kitchen")

time.sleep(3)


#prioritize pressing keys over using the mouse
AdvancedCore.press_button("pagedown")

AdvancedCore.press_button("pagedown")

time.sleep(3)

AdvancedCore.first_point_and_click("Search Awang Kitchen")

AdvancedCore.type("cumi goreng sauce telor asin")
AdvancedCore.press_button("enter")


time.sleep(3)
AdvancedCore.press_button("pagedown")

time.sleep(1)
AdvancedCore.first_point_and_click("Plus Button")

time.sleep(3)
