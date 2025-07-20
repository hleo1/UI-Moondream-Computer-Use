#!/usr/bin/env python3

import argparse
from calendar import c
import os
import sys
from typing import Dict, Any, List, Optional
import base64
from PIL import Image
from openai import OpenAI

import json
from pathlib import Path
import time

# GPT Integration
class GPTClient:
    def __init__(self, api_key: Optional[str] = None):
        api_key = api_key or os.getenv('OPENAI_API_KEY') or os.getenv('MY_OPENAI_KEY')
        if not api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY or MY_OPENAI_KEY environment variable")
        self.client = OpenAI(api_key=api_key)
        self.path_to_file = {}
        self.paths = []
        
    def encode_image(self, image_path: str) -> str:
        """Encode image to base64 for GPT-04-mini"""
        # Open and resize image while maintaining aspect ratio
        image = Image.open(image_path)
        width, height = image.size
        scale = min(1000 / min(width, height), 1.0)  # Only scale down, not up
        if scale < 1.0:
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = image.resize((new_width, new_height))
        
        # Save resized image to bytes and encode
        from io import BytesIO
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def query_gpt(self, prompt: str, folder: str) -> str:
        # 1) Upload your PDF (and/or image) to get back a file_id
        files = [file for file in sorted(os.listdir(folder)) if file.endswith(".png")]
        for file in files:
            path = os.path.join(folder, file)
            if path not in self.paths:
                self.paths.append(path)
                self.path_to_file[path] = self.client.files.create(
                    file=open(path, "rb"),
                    purpose="user_data"
                )
        
        print("Images:", self.paths)

        # 2) Pass those file_ids into your Responses.create call
        response = self.client.responses.create(
            model="o3",
            input=[{
                "role": "user",
                "content": [
                    { "type": "input_text", "text": prompt },
                    *[{"type": "input_image",  "file_id": self.path_to_file[path].id} for path in self.paths]
                ]
            }],
            text={"format": {"type": "text"}},
            reasoning={"effort": "medium"},
            tools=[],
            store=True
        )

        # The generated text will be in `output_text`
        return response.output_text

# Initialize GPT client
gpt_client = GPTClient()

def query(prompt: str, folder: str) -> str:
    """
    Query GPT with the given prompt, folder of screenshots
    
    Args:
        prompt: The text prompt to send to GPT
        folder: Path to folder containing screenshots
        
    Returns:
        GPT response as string
    """
    return gpt_client.query_gpt(prompt, folder)

attachment_explanation = """
    An example of how the user does this task manually is presented to you as a chronologically-ordered sequence of highlighted screenshots.
    Highlighted screenshots are screenshots taken right before the user's click, with the area around the click highlighted.
    In other words, you will be given a list of images like this:
    [screenshot0, screenshot1, ..., screenshotN]
"""

instruction_set = """
    ```
    # mark the very beginning of instructions
    start

    # move mouse to x-coordinate coords[0] and y-coordinate coords[1].
    # coords are between 0 and 1, relative to screen size
    move_to(coords: tuple[float, float]) -> None

    # simulate scrolling to the top in the current cursor position
    scroll_to_top() -> None

    # simulate scrolling down by an amount relative to screen height in the current cursor position
    # returns false if scrolling does not do anything
    scroll_down(amount) -> boolean

    # press the pgup button
    # returns false if the page does not change
    page_up() -> boolean

    # press the pgdn button
    # returns false if the page does not change
    page_down() -> boolean

    # get the relative-to-screen-size coordinates of a highlighted UI element.
    # Each screenshot highlights a UI element.
    # idx is the index of the screenshot that highlights the relevant UI element.
    ui_coords(idx: int) -> tuple[float, float] | None

    # left-click the mouse at the current cursor position
    left_click() -> None

    # right-click the mouse at the current cursor position
    right_click() -> None

    # simulate pressing keys on the keyboard according to the given text
    type_text(text: str) -> None

    # press hot keys, e.g. hot_keys('ctrl', 'c')
    hot_key(*keys: str) -> None

    # if-else statement where condition, do_if_true, and do_it_false are all lambdas with zero arguments.
    # E.g.
    # if_else(
    #     lambda: True,
    #     lambda: (
    #         instruction1,
    #         instruction2,
    #         ...
    #     ),
    #     lambda: (
    #         instruction3,
    #         instruction4,
    #         ...
    #     )
    # )
    if_else(
        condition: Callable[[], bool],
        do_if_true: Callable[[], tuple[instruction, ...]],
        do_if_false: Callable[[], tuple[instruction, ...]]
    ) -> None

    # infinite loop. Runs loop_content in each iteration.
    # E.g.
    # loop(
    #     lambda: (
    #         instruction1,
    #         instruction2,
    #         ...
    #     )
    # )
    loop(loop_content: Callable[[], tuple[instruction, ...]]) -> None

    # breaks the current loop.
    break_loop() -> None

    # saves a value to a variable
    save_var(value: Any, var_name: str) -> None

    # gets the value of a variable
    get_var(var_name: str) -> Any

    # perform an arithmetic operation on args.
    # e.g. arithmetic(lambda x, y, z: x + y + z, get_var("x"), get_var("y"), get_var("z")
    arithmetic(fn, *args: float) -> Any

    # mark the very end of all instructions
    end
    ```
"""

def step1(folder: str, user_query: str = "") -> str:
    """
    Step 1: Understand the task and create human-readable instructions
    """
    task_description = user_query if user_query else "[No specific task provided]"
    
    prompt = f"""
    You are an experienced engineer who is an expert in automation, and your job is to automate repetitive menial tasks by manipulating the gui with tools that will be provided to you later.
    The user is trying to "{task_description}".
    
    {attachment_explanation}
    
    First, describe each image to make sure you understand what the user is doing.

    Then, think about how you would automate it with a sequence of these instructions:

    {instruction_set}

    Finally, think carefully about what variations are required between iterations and any clarifying questions you'd like to ask the user.

    Return your response in this format (Do not include the automation instructions):

    [IMAGES]
    0 <identify the UI element being clicked and briefly describe user action in screenshot0>
    1 <identify the UI element being clicked and briefly describe user action in screenshot1>
    ...

    [CLARIFYING QUESTIONS]
    <questions>
    """

    # with open(f"prompt_step_1_{time.time()}.txt", "w") as f:
    #     f.write(prompt)
    
    result = query(prompt, folder)
    print("=== STEP 1: Initial Analysis ===")
    print(result)
    print("\n" + "="*50 + "\n")
    
    return result

def step2(folder: str, prev_steps: List[str], user_query: str = "") -> str:
    """
    Step 2: Think about variations and ask clarifying questions
    """
    task_description = user_query if user_query else "[No specific task provided]"
    
    prompt = f"""
    You are an experienced engineer who is an expert in automation, and your job is to automate repetitive menial tasks by manipulating the gui with tools that will be provided to you later.
    The user is trying to "{task_description}".
    
    {attachment_explanation}
    
    You previously described each image and asked the user some clarifying questions:
    ```
    {prev_steps[0]}
    ```

    Now that you have more clarity, make sure you have a good understanding of the problem by thinking about how you would list the steps involved in a human-readable way.

    Finally, you are to create and return a simple set of instructions to complete the user's task composed of the following actions:

    {instruction_set}

    A few things to note:
    • Make sure the app right window is in focus when you start by clicking on the window
    • Before clicking, scrolling, or pgup/pgdn, make sure the cursor is in the right position using the move_to() action. Before scrolling or pgup/pgdn, you must also click after moving the cursor.
    • Before typing, make sure to move the cursor to the text input and click it. It may also help to remove the text in the text input before typing.
    • You can pass a hard-coded value into move_to() if appropriate. This is prefereable for elements that will likely stay in the same position on the screen, or elements that will *vary*.
      For example, a UI element like a button will likely always look the same but may be in different positions, ui_coords makes sense.
      Meanwhile, an image in a structured document will likely vary so much that ui_coords would not make sense but they might be in the same position so hard-coding a coordinate makes more sense.
    • Opt to navigate with page_up() and page_down() instead of clicking around whenever possible
    • Identify success conditions of certain steps. e.g. after click, if we expect a new page to load, then we may expect that the screenshot is sufficiently different than the previous page and the new screenshot contains certain texts or images.
    • Comments must start with '#'
    • Variables can ONLY be accessed via get_var()
    • Use python f-string syntax for string formatting / substitution
    • If a lambda spans multiple lines, make sure its contents are wrapped in parentheses and each line ends with a comma.
    • Pay attention to the final screenshot to see the starting condition of the next step. It is not necessarily in the right starting position.
    • Return your response as a code block, formatted according to proper python syntax but only using the instructions provided.
    • DO NOT USE SHELL OR POWERSHELL COMMANDS.
    """
    
    # with open(f"prompt_step_2_{time.time()}.txt", "w") as f:
    #     f.write(prompt)
    
    result = query(prompt, folder)
    print("=== STEP 2: Producing Instructions ===")
    print(result)
    print("\n" + "="*50 + "\n")
    
    return result

def compile(folder, query, start_from):
    cache = []
    if os.path.exists("cache.json"):
        with open("cache.json", "r") as r:
            cache = json.load(r)
    
    # Validate file paths
    if not os.path.exists(folder):
        print(f"Error: Folder not found: {folder}")
        sys.exit(1)
    
    print(f"Processing files:")
    print(f"  Folder: {folder}")
    if query:
        print(f"  Query: {query}")
    print("\n" + "="*60 + "\n")
    
    # Execute the five steps
    results = []

    def save_cache(cache, result, idx):
        cache = cache[:idx]
        cache.append(result)
        with open("cache.json", "w") as f:
            json.dump(cache, f, indent=4)
        return cache
    
    # Step 1
    if start_from < 1 or len(cache) < 1:
        result1 = step1(folder, query)
        results.append(result1)
        results[-1] += "\nANSWERS:\n\n" + "Follow my example to the best of your ability."
        cache = save_cache(cache, results[-1], 0)
    else:
        results.append(cache[0])
    
    # Step 2
    if start_from < 2 or len(cache) < 2:
        result2 = step2(folder, results, query)
        results.append(result2)
        cache = save_cache(cache, results[-1], 1)
    else:
        results.append(cache[1])
    
    with open("test_run.cul", "w") as f:
        f.write(results[-1])
    
    print("=== PROCESS COMPLETE ===")

    code = results[-1]
    code_lines = code.split("\n")
    code_lines = [line.strip() for line in code_lines if line.strip() != ""]
    start_index = code_lines.index("start") + 1
    end_index = code_lines.index("end")
    code = "\n".join(code_lines[start_index:end_index])
    code = code.strip()

    code = "from grandmalib import *\nimport time\ntime.sleep(1)\n" + code

    return code

def main():
    """Main function to handle command line arguments and execute the five-step process"""
    parser = argparse.ArgumentParser(description='Process a folder of screenshots in two analytical steps')
    parser.add_argument('--folder', required=True, help='Path to folder containing screenshots')
    parser.add_argument('--query', default='', help='Specific query or question to focus the analysis on')
    parser.add_argument('--start-from', default=0, type=int)
    
    args = parser.parse_args()

    compile(args.folder, args.query, args.start_from)

if __name__ == "__main__":
    main()
