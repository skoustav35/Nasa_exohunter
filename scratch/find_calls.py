with open("verification_functions.py", "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        if "fit_limb_darkened_transit" in line:
            print(f"{i}: {line.strip()}")
