import sys
import traceback

sys.argv = ["verification_functions.py", "--profile", "261136679", "6.2683"]
try:
    # Read and execute verification_functions.py
    with open("verification_functions.py", "r", encoding="utf-8") as f:
        code = f.read()
    exec(code, globals())
except Exception as e:
    print("EXCEPTION CAUGHT:")
    traceback.print_exc()
