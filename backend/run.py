import os

code = open("test_run.cul").read()
code_lines = code.split("\n")
code_lines = [line.strip() for line in code_lines if line.strip() != ""]
start_index = code_lines.index("start") + 1
end_index = code_lines.index("end")
code = "\n".join(code_lines[start_index:end_index])
code = code.strip()
print(code)

with open("script.py", "w") as f:
    f.write("from grandmalib import *\n")
    f.write("import time\n")
    f.write("time.sleep(1)\n")
    f.write(code)
    f.write("\n\n")

os.system("python script.py")
