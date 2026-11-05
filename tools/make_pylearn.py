# Builds pylearn.js: a mini-lesson before every Python corner puzzle.
# Each example is executed here with real Python so the "Output" shown on screen is exact.
import io, contextlib, json

L = {}
def lesson(d, say, ex, notes, key, words=None):
    L[d] = dict(say=say, ex=ex, notes=notes, key=key, words=words or [])

lesson(1, [
  "Python is a language for giving a computer instructions, one line at a time, top to bottom.",
  "print() is how Python talks back. Whatever you put inside the round brackets shows up on the screen.",
  "Text in Python goes inside quotes. The quotes are not printed; they just show Python where the text starts and stops. Text in quotes is called a string."],
  'print("Grail Room is open")\nprint("Rae: be on time")\nprint(7)',
  ["Shows the words inside the quotes. No quotes on screen.", "Each print() starts a new line.", "Numbers don't need quotes."],
  "print(something) shows something. Quotes mark text; they don't print.", ["string = text in quotes", "function = a command with () after it"])

lesson(2, [
  "A variable is a labeled box that holds a value. You make one with a single = sign: the name goes on the left, the value on the right.",
  "Once the box exists, you use its name (no quotes) and Python swaps in what's inside.",
  "Careful: print(shoes) shows what's in the box. print(\"shoes\") with quotes just shows the word shoes."],
  'shoes = 3\nprint(shoes)\nprint("shoes")',
  ["Make a box named shoes and put 3 in it.", "No quotes: Python looks inside the box and shows 3.", "Quotes: this is just text, so it shows the word."],
  "name = value stores it. Use the name without quotes to get the value back.", ["= means 'store', not 'equals'"])

lesson(3, [
  "Python does math with + − * and /. You can do math with variables too, because Python swaps in their values first.",
  "The trick that confuses everyone: wallet = wallet + 10 is not a broken equation. Python works out the right side first (old wallet plus 10), then stores the answer back in wallet.",
  "Numbers without quotes add up. Numbers inside quotes are text, and \"5\" + \"5\" glues them into \"55\"."],
  'tips = 8\ntips = tips + 4\nprint(tips)\nprint("5" + "5")',
  ["tips starts at 8.", "Right side first: 8 + 4 = 12. Then 12 goes back into tips.", "Shows the new value.", "These are strings, so + glues them together instead of adding."],
  "Right side runs first, then the answer goes into the box on the left.", ["operator = a math symbol like + or *"])

lesson(4, [
  "Changing a box by a little bit happens so often that Python has shortcuts.",
  "x += 5 means x = x + 5. x -= 3 means x = x − 3. There's also *= (multiply) and /= (divide).",
  "Each line changes the box, and the next line starts from the new value."],
  'jar = 50\njar += 10\njar -= 25\nprint(jar)',
  ["The grail jar starts at 50.", "Add 10: now 60.", "Take out 25: now 35.", "Shows 35."],
  "+= adds to what's already there. -= takes away.")

lesson(5, [
  "Python can ask yes-or-no questions with comparison symbols: > (bigger), < (smaller), >= (bigger or equal), <= (smaller or equal), == (equal), != (not equal).",
  "The answer is always True or False. These are called booleans, and they are capitalized in Python.",
  "Don't mix up = and ==. One = stores a value. Two == asks a question."],
  'cash = 75\nprint(cash > 50)\nprint(cash == 100)\nprint(cash != 100)',
  ["Store 75.", "Is 75 bigger than 50? Yes.", "Is 75 equal to 100? No.", "Is 75 not equal to 100? Yes."],
  "Comparisons answer True or False. == asks; = stores.", ["boolean = True or False"])

lesson(6, [
  "The word in checks whether something is inside something else. With text, it checks whether a small piece of text appears in a bigger one.",
  "It's case-sensitive: \"low\" and \"Low\" are different. That's why people often do .lower() first, which turns all letters lowercase.",
  "This is Python's version of SQL's LIKE '%...%'."],
  'shoe = "Comet Mid Gold"\nprint("Gold" in shoe)\nprint("gold" in shoe)\nprint("gold" in shoe.lower())',
  ["A string to search.", "\"Gold\" is in there exactly. True.", "Lowercase g doesn't match capital G. False.", ".lower() makes everything lowercase first, so now it matches."],
  "\"piece\" in text gives True or False. Watch the capital letters.", ["method = a command attached with a dot, like .lower()"])

lesson(7, [
  "if lets Python make a decision. It checks a True/False question. If True, it runs the indented lines under it. If False, it skips them.",
  "else is the backup plan: it runs only when the if question was False. Exactly one of the two runs, never both.",
  "Two rules people forget: a colon : at the end of the if and else lines, and indenting (4 spaces) the lines that belong to each one."],
  'hype = 4\nif hype >= 8:\n    print("Put it up front")\nelse:\n    print("Back shelf")\nprint("Done")',
  ["Store 4.", "Is 4 >= 8? No, so skip the indented line under it.", "(Skipped.)", "The if was False, so the else part runs.", "Shows Back shelf.", "Not indented, so it always runs after the decision."],
  "if True → run the indented block. Otherwise → run else. Colons and indents matter.", ["indent = spaces at the start of a line that put it inside a block"])

lesson(8, [
  "Sometimes a value is missing: no price yet, no release date yet. Python uses None for 'nothing here'. It's the same idea as NULL in SQL.",
  "None is not 0 and it's not empty text. It means unknown.",
  "To check for it, write is None (or is not None). That's the Python habit, just like IS NULL in SQL."],
  'resale = None\nprint(resale)\nif resale is None:\n    print("No resale price yet")',
  ["Nothing known yet.", "Printing it shows the word None.", "The check for missing values.", "Runs because resale really is None."],
  "None means missing. Check it with is None.", ["None = Python's NULL"])

lesson(9, [
  "Percents in Python are written as decimals: 10% is 0.10, 25% is 0.25, 7% is 0.07.",
  "To take a percent off, multiply by (1 − percent). 1 − 0.25 = 0.75, so 25% off means 'keep 75%'.",
  "When decimals are involved, Python shows the answer as a decimal too, so 100 becomes 100.0. Same value, it just has a .0."],
  'price = 80\ndiscount = 0.25\nsale = price * (1 - discount)\nprint(sale)',
  ["Full price.", "25% written as a decimal.", "Brackets first: 1 − 0.25 = 0.75. Then 80 × 0.75.", "Shows 60.0 (decimal math gives a decimal answer)."],
  "x% off → price * (1 - x/100). Decimal in, decimal out.", ["float = a number with a decimal point"])

lesson(10, [
  "You often want to mix text and numbers in one message. An f-string does that.",
  "Put an f right before the opening quote. Then anything inside {curly brackets} gets replaced by its value.",
  "Everything outside the curly brackets prints exactly as written, including symbols like $."],
  'name = "Theo"\npairs = 12\nprint(f"{name} sold {pairs} pairs")\nprint("{name} sold {pairs} pairs")',
  ["A text variable.", "A number variable.", "f-string: the {} get filled in.", "No f, so the curly brackets print as-is."],
  "f\"...{var}...\" drops the value into the text. No f, no fill-in.", ["f-string = formatted string"])

lesson(11, [
  "Math often gives long decimals like 183.6667. round() tidies them up.",
  "round(x, 2) keeps 2 digits after the decimal point. round(x, 1) keeps 1. round(x) with no second number gives a whole number.",
  "It looks at the next digit to decide: 5 or more rounds up, less rounds down."],
  'avg = 47.6382\nprint(round(avg, 2))\nprint(round(avg, 1))\nprint(round(avg))',
  ["A messy average.", "Two decimals: 47.6382 → 47.64 (the 8 rounds the 3 up).", "One decimal: 47.6.", "No decimals: 48."],
  "round(x, n) keeps n decimal places.")

lesson(12, [
  "Normal division / always gives a decimal: 7 / 2 is 3.5.",
  "Floor division // gives only the whole number part and throws away the rest: 7 // 2 is 3. Think 'how many full ones fit?'",
  "Modulo % gives the leftover: 7 % 2 is 1. Think 'what's left over after the full ones?'"],
  'cash = 50\nprint(cash / 15)\nprint(cash // 15)\nprint(cash % 15)',
  ["Big Face has $50 and laces cost $15.", "Regular division: a long decimal.", "How many full $15 laces fit? 3.", "Leftover after 3 × 15 = 45: $5."],
  "// = how many fit. % = what's left over.", ["remainder = what's left after dividing"])

lesson(13, [
  "A list holds many values in order, inside square brackets, separated by commas.",
  "You grab one item with its position number in square brackets. Python starts counting at 0, so the first item is [0], the second is [1].",
  "Negative numbers count from the end: [-1] is the last item, [-2] is second to last."],
  'sizes = [8, 9, 10, 11]\nprint(sizes[0])\nprint(sizes[2])\nprint(sizes[-1])',
  ["A list of 4 shoe sizes. Positions are 0, 1, 2, 3.", "Position 0 is the first item: 8.", "Position 2 is the third item: 10.", "-1 is the last item: 11."],
  "Lists count from 0. [-1] is the last one.", ["index = an item's position number"])

lesson(14, [
  "Python has built-in helpers for lists of numbers. len() counts the items. sum() adds them up.",
  "An average is the total divided by how many there are, so sum(x) / len(x).",
  "That's exactly what SQL's COUNT(), SUM() and AVG() do."],
  'tips = [5, 10, 15]\nprint(len(tips))\nprint(sum(tips))\nprint(sum(tips) / len(tips))',
  ["Three tips.", "How many items? 3.", "Total: 5 + 10 + 15 = 30.", "Average: 30 ÷ 3 = 10.0 (division always gives a decimal)."],
  "len = how many, sum = total, sum/len = average.")

lesson(15, [
  "A for loop repeats the same lines once for each item in a list.",
  "for item in list: picks the first item, puts it in the variable, runs the indented lines, then moves to the next item, until the list runs out.",
  "A common pattern: start a total at 0 before the loop, then add to it inside the loop."],
  'total = 0\nfor p in [10, 20, 5]:\n    total += p\n    print("added", p, "total is", total)\nprint("final", total)',
  ["Start the total at zero, before the loop.", "Loop over the list. p will be 10, then 20, then 5.", "Add this item to the total.", "Shows progress on each turn of the loop.", "Not indented: runs once, after the loop finishes."],
  "for x in list: runs the indented lines once per item.", ["iterate = go through items one by one"])

lesson(16, [
  "You can put an if inside a for loop. The loop visits every item, and the if decides which items get acted on.",
  "Watch the indents: the if is indented once (inside the loop), and the line under the if is indented twice (inside the if).",
  "This is how WHERE works in SQL: look at every row, keep the ones that pass the test."],
  'sizes = [9, 12, 10, 13]\nfor s in sizes:\n    if s >= 12:\n        print("big size", s)',
  ["Four sizes.", "Visit each size.", "Test it.", "Only runs when the test is True: for 12 and 13."],
  "Loop visits everything; the if inside picks what to act on.")

lesson(17, [
  "A function is a reusable recipe. You write it once with def, then call it whenever you need it.",
  "The names in the brackets are parameters: blanks you fill in when you call it. return sends the answer back.",
  "A parameter can have a default, like tax=0.07. If you don't pass that one, the default is used."],
  'def total(price, tax=0.07):\n    return round(price * (1 + tax), 2)\n\nprint(total(100))\nprint(total(100, 0.10))',
  ["Make a recipe called total. tax has a default of 0.07.", "Do the math and send the answer back.", "", "No tax given, so the default 7% is used: 107.0.", "Tax given as 0.10, so 10% is used: 110.0."],
  "def makes a recipe, return hands back the answer, defaults fill in blanks you skip.", ["parameter = a blank in a function", "argument = the value you put in the blank"])

lesson(18, [
  "Lists can change. .append(x) adds x to the end of the list.",
  "len() tells you how many items are in it right now, so it grows as you append.",
  "Positions still start at 0. After appending, the new item is at the end ([-1])."],
  'cart = []\ncart.append("laces")\ncart.append("cleaner")\nprint(cart)\nprint(len(cart), cart[-1])',
  ["An empty list.", "Add one item: [\"laces\"].", "Add another to the end.", "Shows the whole list.", "2 items, and the last one is cleaner."],
  ".append() adds to the end. len() counts what's there now.")

lesson(19, [
  "A dictionary (dict) stores values under labels called keys. It's like one row from a table: each column name points to a value.",
  "Curly brackets make one: {\"key\": value, ...}. You read a value with square brackets and the key in quotes.",
  "Setting a key that already exists replaces the old value. Setting a new key adds it."],
  'shoe = {"model": "Glide 1", "size": 10}\nprint(shoe["model"])\nshoe["size"] = 11\nshoe["price"] = 140\nprint(shoe)',
  ["A dict with two keys: model and size.", "Look up the value under model.", "size exists already, so 10 is replaced with 11.", "price is new, so it gets added.", "Shows the whole dict."],
  "dict[\"key\"] reads a value. dict[\"key\"] = x sets it.", ["key = the label", "value = what's stored under it"])

lesson(20, [
  "A list comprehension builds a new list from an old one in a single line.",
  "Read [p * 2 for p in prices] as: 'p times 2, for every p in prices'. It's a for loop squeezed into square brackets.",
  "You can add an if at the end to keep only some items: [p for p in prices if p > 100]."],
  'prices = [50, 120, 200]\ndoubled = [p * 2 for p in prices]\nbig = [p for p in prices if p > 100]\nprint(doubled)\nprint(big)',
  ["The starting list.", "Make a new list: each price × 2.", "Make a new list with only prices over 100.", "[100, 240, 400]", "[120, 200]"],
  "[do_this for x in list if test] builds a new list in one line.")

lesson(21, [
  "min() finds the smallest value in a list and max() finds the biggest.",
  "max − min is called the range: how spread out the numbers are.",
  "One weird value (an outlier) can stretch the range a lot, so always look at the data, not just the summary."],
  'resale = [210, 190, 205, 640]\nprint(min(resale), max(resale))\nprint(max(resale) - min(resale))',
  ["Four sales. 640 looks off.", "Smallest is 190, biggest is 640.", "Range is 450, mostly because of that one 640."],
  "max - min = range. Outliers stretch it.", ["outlier = a value way off from the rest"])

lesson(22, [
  "pandas is a Python tool for tables. A DataFrame is a table, like a SQL table, with named columns.",
  "groupby(\"brand\")[\"price\"].mean() means: split rows into groups by brand, then average the price in each group. That's SQL's GROUP BY with AVG().",
  "pandas needs the full Python install, so it runs in the Colab notebook kit, not this page. Below is the same idea done by hand with a dict, which does run here."],
  'rows = [("Kitebird", 100), ("Mavrik", 300), ("Kitebird", 200)]\ngroups = {}\nfor brand, price in rows:\n    groups[brand] = groups.get(brand, []) + [price]\nfor brand, prices in groups.items():\n    print(brand, sum(prices) / len(prices))',
  ["Three sales: (brand, price) pairs.", "An empty dict to collect prices per brand.", "Take each pair apart into brand and price.", "Add this price to that brand's list (start an empty list if it's new).", "Go through each brand and its prices.", "Average per brand. pandas does all of this in one line."],
  "groupby + mean = GROUP BY + AVG(). pandas runs in Colab.", ["DataFrame = a table in pandas"])

lesson(23, [
  "A straight line has a rule: y = m × x + b. m is the slope (how much y goes up for each step in x) and b is where the line starts.",
  "Machine learning's simplest model is exactly this. It looks at past data to choose m and b. Then you plug in a new x to get a guess for y.",
  "Here x is hype (1 to 10) and y is how far over retail a shoe resells, in %."],
  'm = 5\nb = -10\nfor hype in [2, 6, 10]:\n    guess = m * hype + b\n    print("hype", hype, "→ guess", guess)',
  ["Slope: each hype point adds 5%.", "Start point: −10%.", "Try three hype scores.", "The line's rule.", "Shows each prediction."],
  "Model = rule. Plug in x, get a guessed y.", ["slope = how steep the line is", "prediction = the model's guess"])

lesson(24, [
  "How does a model choose its numbers? It starts with a guess, measures how wrong it is, and nudges the number to be less wrong. Repeat.",
  "The gradient says which way is 'more wrong'. So you step the opposite way: new = old − learning_rate × gradient.",
  "The learning rate is the step size. Too small: slow. Too big: it jumps past the answer."],
  'w = 1.0\nlr = 0.5\ngradient = 2.0\nw = w - lr * gradient\nprint(w)',
  ["Current guess for the weight.", "Step size.", "Positive gradient: going up makes it worse.", "1.0 − 0.5 × 2.0 = 0.0. We stepped down.", "Shows 0.0."],
  "new = old - lr * gradient. Step opposite the slope.", ["gradient = which way is uphill", "learning rate = step size"])

lesson(25, [
  "Accuracy is the share of guesses that were right: right ÷ total.",
  "zip(a, b) pairs up two lists item by item: first with first, second with second.",
  "In Python, True counts as 1 and False as 0, so sum() of a bunch of True/False answers counts the Trues."],
  'guess = ["heat", "brick", "heat"]\nreal  = ["heat", "heat", "heat"]\nfor g, r in zip(guess, real):\n    print(g, r, g == r)\nprint(sum(g == r for g, r in zip(guess, real)))',
  ["The model's three guesses.", "What really happened.", "Walk both lists side by side.", "Show each pair and whether it matched.", "Count the matches: 2 of 3."],
  "zip pairs lists up. sum of True/False counts the Trues.")

lesson(26, [
  "To group similar sales, a computer needs to measure how far apart two points are.",
  "Distance is the Pythagorean rule: square the gap in each direction, add them up, then take the square root. In Python, ** is 'to the power of', and ** 0.5 is a square root.",
  "A tuple like (3, 4) is a list that can't change. a[0] is its first number, a[1] its second."],
  'a = (0, 0)\nb = (3, 4)\ngap_x = b[0] - a[0]\ngap_y = b[1] - a[1]\nprint(gap_x ** 2, gap_y ** 2)\nprint((gap_x ** 2 + gap_y ** 2) ** 0.5)',
  ["Point a.", "Point b.", "Gap across: 3.", "Gap up: 4.", "Squared: 9 and 16.", "√(9 + 16) = √25 = 5.0."],
  "distance = (dx**2 + dy**2) ** 0.5", ["tuple = a fixed list in ( )", "** = power"])

lesson(27, [
  "AI tools can sound confident and still be wrong about numbers. The fix is easy: check against the data yourself.",
  ".count(x) tells you how many times x appears in a list.",
  "Then compare the AI's claim to the real count with ==. True means the AI was right."],
  'sales = ["Glide", "Dash", "Glide", "Glide"]\nai_claim = 2\nreal = sales.count("Glide")\nprint(real, real == ai_claim)',
  ["The real data.", "What the AI told us.", "Count it ourselves: 3.", "3 vs the claim of 2: False. The AI was wrong."],
  "Trust, then verify: count it yourself and compare.")

lesson(28, [
  "Dates aren't just text. Python's datetime tool lets you do math with them.",
  "from datetime import date brings in the date tool. date(2026, 12, 1) means year, month, day, in that order.",
  "Subtracting two dates gives a gap. .days turns that gap into a plain number of days."],
  'from datetime import date\nstart = date(2026, 11, 1)\nend = date(2026, 11, 15)\ngap = end - start\nprint(gap.days)',
  ["Bring in the date tool.", "Nov 1, 2026.", "Nov 15, 2026.", "Later minus earlier.", "14 days."],
  "date(y, m, d). later - earlier gives a gap; .days is the number.", ["import = bring in a tool"])

lesson(29, [
  "A while loop repeats as long as its test is True. It's for when you don't know how many times you'll need.",
  "Each time through, something inside should change, or the loop never ends.",
  "A counter (weeks += 1) keeps track of how many times it ran."],
  'jar = 10\ndays = 0\nwhile jar < 40:\n    jar += 12\n    days += 1\n    print("day", days, "jar", jar)\nprint("Done in", days, "days")',
  ["Starting cash in the jar.", "Counter starts at 0.", "Keep going while the jar is under 40.", "Save 12 each day.", "Count the day.", "Show progress.", "Runs once the test turns False."],
  "while test: repeats until the test is False. Change something inside!")

lesson(30, [
  "Real programs mix everything you've learned. Today's puzzle uses a dict, a function, a loop and math together. Read it in pieces.",
  ".items() loops over a dict and hands you each key and value together, so for name, cash in jar.items(): gives you both at once.",
  "A function can loop and add things up inside, then return the total. Code outside the function only sees what comes back."],
  'jar = {"Mon": 12, "Tue": 0, "Wed": 20}\n\ndef total_saved(days):\n    total = 0\n    for day, cash in days.items():\n        if cash > 0:\n            print(day, "saved", cash)\n        total += cash\n    return total\n\nprint("Total:", total_saved(jar))',
  ["A dict: day → cash saved.", "", "A recipe that takes a dict of days.", "Start a running total inside the function.", ".items() gives each day and its cash together.", "Only mention days where he saved something.", "Prints Mon and Wed (Tue was 0).", "Add every day's cash, even 0.", "Hand the total back.", "", "Call the function and print what it returns: 32."],
  "Break big code into pieces: what's the data, what does the function do, what comes back?", ["return = hand an answer back"])

out = {}
for d, l in L.items():
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(l["ex"], {})
    lines = l["ex"].split("\n")
    assert len(l["notes"]) == len(lines), (d, len(l["notes"]), len(lines))
    out[d] = dict(l, out=buf.getvalue().rstrip("\n"))

js = "/* Learn it first: a mini-lesson before each Python corner puzzle. Generated by tools/make_pylearn.py; outputs come from real Python. */\nconst PYLEARN = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n"
open("pylearn.js", "w").write(js)
json.dump({d: v["ex"] for d, v in out.items()}, open("/tmp/claude-0/-home-claude/97748ccb-837e-5017-b2c8-0fd30bd87969/scratchpad/mp/learn_ex.json", "w"))
json.dump({d: v["out"] for d, v in out.items()}, open("/tmp/claude-0/-home-claude/97748ccb-837e-5017-b2c8-0fd30bd87969/scratchpad/mp/learn_out.json", "w"))
print("wrote", len(out), "lessons")
