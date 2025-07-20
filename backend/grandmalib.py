from typing import Callable, Any
from internal.advanced_core import AdvancedCore
from internal.core import Core
from internal.template_matching import template_match_impl
import time
import os
from PIL import Image
from pathlib import Path

# constants
PIXELS_PER_CLICK = 10

def get_file_directory() -> Path:
    """Get the directory of the current script"""
    return Path(__file__).parent


# global variables
loop_should_continue: list[bool] = []
variables: dict[str, Any] = {}

# move mouse to x-coordinate coords[0] and y-coordinate coords[1].
# coords are between 0 and 1, relative to screen size
def move_to(coords: tuple[float, float] | None) -> None:
    print(f"move_to: {coords}")
    if not coords:
        print("move_to: coords is None. Skipping.")
        continue_loop()
        return
    Core.move_to(
        int(coords[0] * AdvancedCore.screen_width),
        int(coords[1] * AdvancedCore.screen_height),
    )

# simulate scrolling to the top in the current cursor position
def scroll_to_top() -> None:
    print("scroll_to_top")
    before = Core.get_screenshot()
    while True:
        print("scrolling up")
        Core.scroll(100)
        new_screenshot = Core.get_screenshot()
        if new_screenshot == before:
            break
        before = new_screenshot
    return

# simulate scrolling down by an amount relative to screen height in the current cursor position
# returns false if scrolling does not do anything
def scroll_down(amount) -> bool:
    print(f"scroll_down: {amount}")
    amount_in_clicks = amount * AdvancedCore.screen_height / PIXELS_PER_CLICK
    before = Core.get_screenshot()
    Core.scroll(-amount_in_clicks)
    return Core.get_screenshot() != before

# press the pgup button
# returns false if the page does not change
def page_up() -> bool:
    print("page_up")
    before = Core.get_screenshot()
    AdvancedCore.press_button("pageup")
    return Core.get_screenshot() != before

# press the pgdn button
# returns false if the page does not change
def page_down() -> bool:
    print("page_down")
    # TODO: Keep or?
    move_to((0.5, 0.5))
    left_click()

    before = Core.get_screenshot()
    AdvancedCore.press_button("pagedown")
    return Core.get_screenshot() != before

def obfuscate(text):
    builder = ""
    for c in text:
        builder += c + "$"
    return builder

def ui_coords(idx: int) -> tuple[float, float] | None:
    print(f"ui_coords: {idx}")
    screenshot = Core.get_screenshot()
    directory = get_file_directory() / "../do-it-once vanilla/clicks_vicinity"
    files = [file for file in sorted(os.listdir(directory)) if file.endswith(".png")]
    template_path = str(directory / files[idx])
    template = Image.open(template_path)

    match = template_match_impl(template, screenshot, only_return_max_match=True, threshold=0.3)
    if match:
        return match[0], match[1]
    return None

# get the relative-to-screen-size coordinates of an instance of text on screen
def text_coords(text: str, expected_bounding_box: tuple[float, float, float, float] | None) -> tuple[float, float] | None:
    print(f"text_coords", obfuscate(text))
    ebb = expected_bounding_box
    if ebb:
        points = AdvancedCore.get_all_point_with_search_term_and_crop(text, {"x": ebb[0], "y": ebb[1]}, {"x": ebb[2], "y": ebb[3]})
        if points:
            print("Found point in expected bounding box")
            return points[0]["x"], points[0]["y"]
    screenshot = Core.get_screenshot()
    points = AdvancedCore.point_image_moondream(text, screenshot)
    if points is None:
        print("Found point elsewhere")
        return None
    return points[0]["x"], points[0]["y"]

# get the relative-to-screen-size coordinates of an image that matches a description
def image_coords(text: str) -> tuple[float, float] | None:
    print("image_coords")
    # point_image_moondream
    # get_all_point_with_search_term_and_crop
    # get_all_points_with_search_term
    # find_first_point_with_search_term
    # find_closest_point_and_click
    # find_closest_point_and_click_within_bounding_box used once in sweetwater
    # first_point_and_click used 6x in sweetwater, 4x in grubhub, 2x in powerpoint
    screenshot = Core.get_screenshot()
    points = AdvancedCore.point_image_moondream(text, screenshot)
    if points is None:
        return None
    return points[0]["x"], points[0]["y"]

# left-click the mouse at the current cursor position
def left_click() -> None:
    print("left_click")
    prev_screenshot = Core.get_screenshot()
    now = time.time()
    Core.left_click()
    curr_screenshot = Core.get_screenshot()
    while ((time.time() - now) < 1.5) and curr_screenshot == prev_screenshot:
        prev_screenshot = curr_screenshot
        curr_screenshot = Core.get_screenshot()

# right-click the mouse at the current cursor position
def right_click() -> None:
    print("right_click")
    prev_screenshot = Core.get_screenshot()
    now = time.time()
    Core.right_click()
    curr_screenshot = Core.get_screenshot()
    while ((time.time() - now) < 3) and curr_screenshot == prev_screenshot:
        prev_screenshot = curr_screenshot
        curr_screenshot = Core.get_screenshot()

# simulate pressing keys on the keyboard according to the given text
def type_text(text: str) -> None:
    left_click()
    hot_key("command", "a")
    print(f"type_text: {text}")
    Core.type(text)

# press hot keys, e.g. hot_keys(‘ctrl’, ‘c’)
def hot_key(*keys: str) -> None:
    print(f"hot_key: {keys}")
    import platform
    # Convert ctrl -> cmd on Mac, and cmd -> ctrl on Windows
    keys_list = list(keys)
    if platform.system() == "Darwin":  # Mac OS
        keys_list = ["command" if k == "ctrl" else k for k in keys_list]
    else:  # Windows
        keys_list = ["ctrl" if k == "command" else k for k in keys_list]
    AdvancedCore.hotkey_fn_down(*keys_list)

# if-else statement where condition, do_if_true, and do_it_false are all lambdas with zero arguments.
def if_else(
    condition: Callable[[], bool],
    do_if_true: Callable[[], None],
    do_if_false: Callable[[], None]
) -> None:
    print("if_else")
    if condition():
        do_if_true()
    else:
        do_if_false()

# infinite loop. Runs loop_content in each iteration.
def loop(loop_content: Callable[[], None]) -> None:
    print("loop")
    loop_should_continue.append(True)
    while loop_should_continue[-1]:
        try:
            loop_content()
        except Exception as e:
            if e.args[0] == "continue loop":
                continue
            else:
                raise e
    loop_should_continue.pop()

# breaks the current loop.
def break_loop() -> None:
    print("break_loop")
    loop_should_continue[-1] = False

def continue_loop() -> None:
    print("continue_loop")
    raise Exception("continue loop")

# saves a value to a variable
def save_var(value: Any, var_name: str) -> None:
    print(f"save_var: {var_name} = {value}")
    variables[var_name] = value

# gets the value of a variable
def get_var(var_name: str) -> Any:
    print(f"get_var: {var_name}")
    return variables[var_name]

# perform an arithmetic operation on args.
# e.g. arithmetic(lambda x, y, z: x + y + z, get_var(“x”), get_var(“y”), get_var(“z”)
def arithmetic(fn, *args: float) -> Any:
    print(f"arithmetic: {fn.__name__} {args}")
    return fn(*args)