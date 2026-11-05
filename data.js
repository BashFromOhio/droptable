/* DROP TABLE — course content. One story for everyone: your shifts at the Grail Room, a rare-sneaker shop.
   REAL data: releases (releases.js snapshot / live feed). PRACTICE data: shoes + sales (made-up brands, fixed seed). */

const STORE = { name: "Grail Room", manager: "Rae", lead: "Theo", hero: "Big Face", heroShort: "Big Face" };

const SIM = { period_start: "2026-08-01", period_end: "2026-10-31", note: "Made-up brands and consignment sales, generated for practice. Not real prices." };

/* shoe_id, brand, model, colorway, release_date, retail_usd, pairs_made, hype (1-10) */
const SIM_SHOES = [
  [1, "Northbound", "Glide 1", "Ice Blue", "2026-03-14", 120, 40000, 3],
  [2, "Northbound", "Glide 1", "Lava", "2026-05-02", 120, 15000, 7],
  [3, "Northbound", "Summit Hi", "Forest", "2026-04-11", 160, 25000, 5],
  [4, "Northbound", "Summit Hi", "Midnight", "2026-07-18", 160, 8000, 8],
  [5, "Northbound", "Trail Kid", "Sunrise", "2026-06-06", 90, 60000, 2],
  [6, "Halo Athletic", "Orbit 3", "Cosmic Purple", "2026-03-28", 180, 12000, 8],
  [7, "Halo Athletic", "Orbit 3", "Moon Grey", "2026-06-20", 180, 30000, 4],
  [8, "Halo Athletic", "Pulse Low", "Neon Lime", "2026-05-16", 110, 50000, 3],
  [9, "Halo Athletic", "Pulse Low", "Panda", "2026-08-08", 110, 20000, 6],
  [10, "Halo Athletic", "Comet Mid", "Gold Rush", "2026-09-12", 220, 5000, 10],
  [11, "Kitebird", "Skyline", "Bubblegum", "2026-04-25", 100, 35000, 5],
  [12, "Kitebird", "Skyline", "Storm", "2026-07-04", 100, 45000, 2],
  [13, "Kitebird", "Flutter 2", "Coral Reef", "2026-05-30", 140, 10000, 7],
  [14, "Kitebird", "Flutter 2", "Night Owl", "2026-08-22", 140, 18000, 6],
  [15, "Kitebird", "Nest Slide", "Oatmeal", "2026-06-13", 60, 80000, 1],
  [16, "Mavrik", "Court King", "Royal", "2026-03-07", 150, 22000, 6],
  [17, "Mavrik", "Court King", "Bred", "2026-07-25", 150, 9000, 9],
  [18, "Mavrik", "Dash 5", "Volt", "2026-04-18", 130, 40000, 3],
  [19, "Mavrik", "Dash 5", "Shadow", "2026-09-05", 130, 14000, 7],
  [20, "Mavrik", "Legacy 85", "Varsity Red", "2026-09-26", 200, 6000, 9]
];

function mulberry32(seed) { return function () { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* The store's consignment sales log. Deterministic: same seed, same rows for everyone. */
function makeSimSales() {
  const rnd = mulberry32(20261105);
  const day = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const start = day(SIM.period_start), end = day(SIM.period_end), DAY = 86400000;
  const sizes = [4, 5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14];
  const sizeW = [1, 2, 3, 5, 6, 8, 9, 10, 10, 10, 9, 8, 6, 5, 3, 1];
  const pickSize = () => { let r = rnd() * sizeW.reduce((a, b) => a + b, 0); for (let i = 0; i < sizes.length; i++) { r -= sizeW[i]; if (r <= 0) return sizes[i]; } return 10; };
  const sales = []; let id = 1;
  for (const [sid, , , , rel, retail, pairs, hype] of SIM_SHOES) {
    const first = Math.max(start, day(rel));
    const n = Math.round(18 + hype * hype * 1.6 + rnd() * 10);
    for (let k = 0; k < n; k++) {
      const t = first + Math.floor(rnd() * ((end - first) / DAY + 1)) * DAY;
      const weeksOut = Math.max(0, (t - day(rel)) / DAY / 7);
      const size = pickSize();
      const used = rnd() < 0.12;
      let prem = (hype - 4) * 0.11 + (8000 / pairs) * 0.15 - weeksOut * 0.006 * hype + (rnd() - 0.5) * 0.18;
      if (size <= 5 || size >= 13) prem += 0.08;
      let price = retail * (1 + prem) * (used ? 0.72 : 1);
      price = Math.max(retail * 0.55, price);
      sales.push([id++, sid, iso(t), size, Math.round(price), used ? "used" : "new"]);
    }
  }
  sales.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
  sales.forEach((s, i) => (s[0] = i + 1));
  return sales;
}

/* Rep = points you earn for finished shifts. Tiers climb from a fresh pair to True Sneakerhead.
   Each tier has its own shoe color for the badge. [min rep, name, upper, accent, sole, tagline] */
const RANKS = [
  [0, "Fresh Laces", "#F4F4F2", "#C9CCD1", "#FFFFFF", "Just laced up. Everyone starts here."],
  [150, "Rotation Builder", "#9A9DA3", "#1D1D1F", "#F4F4F2", "You know your way around the stockroom."],
  [400, "Heat Spotter", "#F57C00", "#1D1D1F", "#F4F4F2", "You can tell heat from bricks with data."],
  [750, "Legit Checker", "#C8102E", "#F4F4F2", "#1D1D1F", "Joins, labels, rankings: nothing fake gets past you."],
  [1200, "Grail Hunter", "#6B3FA0", "#FFD23D", "#F4F4F2", "Python, charts and notebooks in your bag."],
  [1800, "True Sneakerhead", "#D4A017", "#1D1D1F", "#FFD23D", "Models, AI and the whole store. Legend status."]
];

/* Reference docs: every column, clickable from any shift */
const COLUMN_DOCS = {
  releases: {
    id: ["number", "Row number we gave each release.", "12"],
    release_date: ["text 'YYYY-MM-DD'", "The day it drops. Always in quotes, year first, so sorting works.", "'2026-11-14'"],
    brand: ["text", "Who makes it: Nike, Jordan, adidas, New Balance… Spelled like the list, so 'Jordan' not 'Air Jordan'.", "'Jordan'"],
    name: ["text", "Full release name. The nickname is in double quotes inside it.", "Air Jordan 11 \"Green Screen\""],
    colorway: ["text or NULL", "The official colors, split by slashes. NULL when not announced yet.", "'White/Black-Infrared'"],
    style_code: ["text or NULL", "The brand's product code, like a SKU. Same code = same shoe.", "'CT8529-105'"],
    retail_usd: ["number or NULL", "Store price in US dollars. NULL means the price isn't announced (use IS NULL to find them).", "225"]
  },
  shoes: {
    shoe_id: ["number", "ID for each practice shoe. Links to sales.shoe_id.", "4"],
    brand: ["text", "Made-up brand: Northbound, Halo Athletic, Kitebird or Mavrik.", "'Kitebird'"],
    model: ["text", "Model name.", "'Glide 1'"],
    colorway: ["text", "Colors.", "'Lava'"],
    release_date: ["text 'YYYY-MM-DD'", "When this practice shoe came out.", "'2026-07-18'"],
    retail_usd: ["number", "Store price in dollars.", "160"],
    pairs_made: ["number", "How many pairs exist. Fewer pairs = rarer.", "8000"],
    hype: ["number 1–10", "How excited people are. 10 = everyone wants it.", "9"]
  },
  sales: {
    sale_id: ["number", "ID for each sale.", "301"],
    shoe_id: ["number", "Which shoe sold. Match it to shoes.shoe_id with a JOIN.", "4"],
    sale_date: ["text 'YYYY-MM-DD'", "Day it sold (Aug 1 – Oct 31, 2026).", "'2026-09-12'"],
    size_us: ["number", "US men's size.", "10.5"],
    price_usd: ["number", "What the buyer paid, in dollars.", "245"],
    condition: ["text", "'new' (never worn, called deadstock) or 'used'.", "'new'"]
  }
};

/* SQL cheat sheet: unlocks as you reach each day. [day, keyword, what it does, example] */
const CHEAT = [
  [2, "SELECT * FROM", "Show every column of a table.", "SELECT * FROM releases;"],
  [3, "SELECT col, col", "Show only the columns you name.", "SELECT name, retail_usd FROM releases;"],
  [4, "ORDER BY … DESC", "Sort. ASC = small to big (default), DESC = big to small.", "SELECT name, retail_usd FROM releases ORDER BY retail_usd DESC;"],
  [4, "LIMIT", "Keep only the first N rows.", "SELECT name FROM releases LIMIT 5;"],
  [5, "WHERE", "Keep rows that match a rule. Text goes in 'single quotes'.", "SELECT name FROM releases WHERE brand = 'Jordan';"],
  [5, "AND / OR", "Combine rules. AND = both true, OR = either.", "SELECT name FROM releases WHERE brand = 'Nike' AND retail_usd < 150;"],
  [6, "LIKE '%word%'", "Search inside text. % means 'anything here'.", "SELECT name FROM releases WHERE name LIKE '%Dunk%';"],
  [7, "BETWEEN … AND", "A range, including both ends. Great for dates.", "SELECT name FROM releases WHERE release_date BETWEEN '2026-11-01' AND '2026-11-30';"],
  [7, "date('now')", "Today's date (UTC). Add days with date('now', '+7 days').", "SELECT name FROM releases WHERE release_date <= date('now', '+7 days');"],
  [8, "IS NULL", "Find blanks. Never write = NULL.", "SELECT name FROM releases WHERE retail_usd IS NULL;"],
  [9, "COUNT / AVG / MIN / MAX / SUM", "Squash many rows into one number.", "SELECT COUNT(*), AVG(retail_usd) FROM releases;"],
  [9, "AS", "Give a result column a nickname.", "SELECT AVG(retail_usd) AS avg_price FROM releases;"],
  [9, "ROUND(x, 2)", "Round a number.", "SELECT ROUND(AVG(retail_usd), 2) FROM releases;"],
  [10, "GROUP BY", "One answer per group.", "SELECT brand, COUNT(*) FROM releases GROUP BY brand;"],
  [11, "strftime('%W', date)", "Pull a piece out of a date: %Y year, %m month, %W week.", "SELECT strftime('%W', release_date) AS wk, COUNT(*) FROM releases GROUP BY wk;"],
  [12, "HAVING", "Filter groups (WHERE filters rows, HAVING filters groups).", "SELECT release_date, COUNT(*) FROM releases GROUP BY release_date HAVING COUNT(*) >= 4;"],
  [14, "JOIN … ON", "Glue two tables where an ID matches.", "SELECT sh.model, s.price_usd FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id;"],
  [15, "CASE WHEN … THEN … ELSE … END", "Make a label from a rule.", "SELECT price_usd, CASE WHEN price_usd > 300 THEN 'heat' ELSE 'normal' END FROM sales;"],
  [16, "WITH name AS (…)", "Save a query as a temporary table, then use it.", "WITH avgp AS (SELECT AVG(price_usd) AS a FROM sales) SELECT COUNT(*) FROM sales, avgp WHERE price_usd > a;"],
  [17, "RANK() OVER (ORDER BY …)", "Number rows 1, 2, 3 by a value (a window function).", "SELECT brand, COUNT(*) AS n, RANK() OVER (ORDER BY COUNT(*) DESC) FROM shoes GROUP BY brand;"]
];

/* Departments = weeks. Each unlocks a part of the data stack. */
const WEEKS = [
  { n: 1, id: "stock", story: "His real name is Michael, but nobody calls him that. Everybody calls him Big Face, because he's always chasing big face hundreds: the $100 bills with the giant portrait on the front. Today is his first day at the Grail Room, the rarest sneaker shop in Atlanta. He's just a kid saving for his first grail, and math class has never made sense. Rae hands him the release calendar: it's just a list, like the wishlist on his phone. That's data.", name: "The stockroom", tool: "SQL basics", who: "Rae, store manager", blurb: "Learn what data is and pull boxes off the shelf: pick, sort and filter the real release calendar." },
  { n: 2, id: "desk", story: "Customers fire questions at the counter: when, how many, how much? Big Face figures out averages are the same math he uses to work out how many weeks until he can afford a pair.", name: "The front desk", tool: "SQL: time + totals", who: "Rae, store manager", blurb: "Customers ask when, how many and how much. Time periods, counts, averages and groups." },
  { n: 3, id: "consign", story: "Consigners bring pairs to sell. Big Face links sales to shoes and works out which ones sell for way over retail: percentages, finally useful.", name: "The consignment office", tool: "SQL: joins + logic", who: "Rae, store manager", blurb: "The store's sales log (practice data). Join tables, label heat vs bricks, rank brands." },
  { n: 4, id: "back", story: "Theo pulls Big Face into the back office and opens a laptop: Python. Same questions as before, but code can loop through thousands of rows while you grab lunch.", name: "The back office", tool: "Python + analytics", who: "Theo, data lead", blurb: "Same questions in Python. pandas is SQL's twin; notebooks clean data and draw charts." },
  { n: 5, id: "lab", story: "The AI lab. Big Face trains the same kind of models that pick what shows up in his feed, and learns why you always check an AI's work before trusting it.", name: "The AI lab", tool: "Machine learning + AI", who: "Theo, data lead", blurb: "Train real models in your browser: a price line, a heat detector, customer groups. Then work with an AI teammate." }
];

/* Day fields
   time + boss: the story beat · say: the idea in plain words · deep: more detail (optional) · an: like-you're-10
   type: sql (default) | quiz | lab | free · ex: example SQL · ch: challenge {q, sol, order?, starter:{fill, skeleton}, hints[]}
   py: the pandas twin. Help gets lighter as weeks go on: week 1 fill-in-the-blank, weeks 2-3 skeleton, weeks 4-5 blank editor. */
const DAYS = [
  { d: 1, w: 1, t: "What is data?", type: "quiz", xp: 30, time: "9:00 AM",
    boss: "Welcome to the Grail Room! Before you touch a single box, you need to know what we track. Everything in this shop runs on data.",
    say: "Data is facts you write down so you can look at them later. A shoe's price, its release day and its colors are all data.",
    deep: "Each fact has a type: text, number, date, true/false, or missing. Analysis starts with knowing which one you have.",
    an: "A sticker on a shoe box is data: size 9, style code, price. You can read it again tomorrow.",
    quiz: [
      { q: "Which one is data about a sneaker?", o: ["Retail price: $130", "I feel happy", "Go outside", "Tomorrow is fun"], w: "A price is a fact you can write down and compare." },
      { q: "A release date written as 2026-11-21 is…", o: ["a date", "a number you add up", "a color", "a size"], w: "Year-month-day is a date. Written this way it also sorts in order." },
      { q: "The price says 'not stated'. In data that's called…", o: ["missing (NULL)", "zero", "free", "an error you delete"], w: "Missing isn't zero. A $0 shoe and a shoe with no price yet are different things." },
      { q: "One shoe = one ___ in a table.", o: ["row", "column", "database", "chart"], w: "Each row is one thing (one shoe). Each column is one fact about it (its price)." }
    ] },
  { d: 2, w: 1, t: "Tables are shoe boxes", xp: 30, time: "9:40 AM",
    boss: "This is the release wall: every shoe dropping soon, from a real calendar. Show me the first ten so I know you can read it.",
    say: "A table is like a wall of shoe boxes. Each box (row) is one shoe. Each label line (column) is one fact. SELECT means 'show me', and * means 'every column'.",
    deep: "LIMIT caps how many rows come back. Handy when a table is big.",
    an: "Pulling the first five boxes off the shelf to peek inside.",
    ex: "SELECT * FROM releases LIMIT 5;",
    ch: { q: "Show the first 10 rows of releases.", sol: "SELECT * FROM releases LIMIT 10;", starter: { fill: "SELECT * FROM releases LIMIT ___;", skeleton: "SELECT ___ FROM ___ LIMIT ___;" },
      hints: ["Change the number after LIMIT.", "LIMIT 10 shows 10 rows.", "SELECT * FROM releases LIMIT 10;"] },
    py: "import pandas as pd\nreleases = pd.read_csv('releases.csv')\nreleases.head(10)" },
  { d: 3, w: 1, t: "Pick your columns", xp: 40, time: "11:15 AM",
    boss: "A customer on the phone only wants names and prices. Don't read them the whole label!",
    say: "You don't always want every fact. Name the columns you want, with commas between them.",
    an: "Only reading the size and price off each box label.",
    ex: "SELECT name, release_date FROM releases LIMIT 5;",
    ch: { q: "Show the name and retail_usd of every release.", sol: "SELECT name, retail_usd FROM releases;", starter: { fill: "SELECT name, ___ FROM releases;", skeleton: "SELECT ___, ___ FROM releases;" },
      hints: ["The price column is called retail_usd.", "Two columns, separated by a comma.", "SELECT name, retail_usd FROM releases;"] },
    py: "releases[['name', 'retail_usd']]" },
  { d: 4, w: 1, t: "Sort by price", xp: 40, time: "1:30 PM",
    boss: "We're making a 'Big Ticket' shelf. Find the five most expensive releases, priciest first.",
    say: "ORDER BY puts rows in order. Add DESC to start with the biggest number. LIMIT keeps just the top few.",
    deep: "In SQLite, empty prices (NULL) sort first when you go smallest-to-biggest.",
    an: "Lining up shoe boxes from most to least expensive.",
    ex: "SELECT name, retail_usd FROM releases ORDER BY retail_usd DESC LIMIT 3;",
    ch: { q: "Show the 5 most expensive releases: name and retail_usd, highest first.", sol: "SELECT name, retail_usd FROM releases ORDER BY retail_usd DESC LIMIT 5;", order: 1,
      starter: { fill: "SELECT name, retail_usd FROM releases ORDER BY retail_usd ___ LIMIT 5;", skeleton: "SELECT name, retail_usd FROM releases ORDER BY ___ LIMIT ___;" },
      hints: ["DESC means biggest first.", "LIMIT 5 keeps the top five.", "SELECT name, retail_usd FROM releases ORDER BY retail_usd DESC LIMIT 5;"] },
    py: "releases.sort_values('retail_usd', ascending=False).head(5)[['name', 'retail_usd']]" },
  { d: 5, w: 1, t: "Filter by brand", xp: 50, time: "3:05 PM",
    boss: "The adidas rep visits tomorrow. Pull every adidas release so I'm ready.",
    say: "WHERE keeps only the rows you want. Text goes in single quotes, and spelling matters: 'adidas' is all lowercase in this data.",
    an: "Only pulling the boxes with the adidas logo.",
    ex: "SELECT name, release_date FROM releases WHERE brand = 'Vans';",
    ch: { q: "Show name and release_date for every adidas release.", sol: "SELECT name, release_date FROM releases WHERE brand = 'adidas';", starter: { fill: "SELECT name, release_date FROM releases WHERE brand = '___';", skeleton: "SELECT name, release_date FROM releases WHERE ___ = '___';" },
      hints: ["The brand column holds the brand name.", "Spell it exactly: adidas (lowercase).", "SELECT name, release_date FROM releases WHERE brand = 'adidas';"] },
    py: "releases.loc[releases['brand'] == 'adidas', ['name', 'release_date']]" },
  { d: 6, w: 1, t: "Search inside names", xp: 50, time: "5:20 PM",
    boss: "Everyone keeps asking about the Space Jam stuff. Find every release with Space Jam in the name.",
    say: "LIKE searches for words inside text. % means 'anything can go here'. So '%Space Jam%' finds Space Jam anywhere in the name.",
    deep: "_ matches exactly one character. In SQLite, LIKE ignores upper/lower case for plain letters.",
    an: "Flipping through boxes for any label that says 'Space Jam'.",
    ex: "SELECT name FROM releases WHERE name LIKE '%Batman%';",
    ch: { q: "Show the name and retail_usd of every release with \"Space Jam\" in its name.", sol: "SELECT name, retail_usd FROM releases WHERE name LIKE '%Space Jam%';", starter: { fill: "SELECT name, retail_usd FROM releases WHERE name LIKE '%___%';", skeleton: "SELECT name, retail_usd FROM releases WHERE name LIKE '___';" },
      hints: ["Put % on both sides of the words.", "LIKE '%Space Jam%'", "SELECT name, retail_usd FROM releases WHERE name LIKE '%Space Jam%';"] },
    py: "releases.loc[releases['name'].str.contains('Space Jam', case=False), ['name', 'retail_usd']]" },

  { d: 7, w: 2, t: "Pick a time period", xp: 60, time: "10:00 AM",
    boss: "A dad wants everything dropping Thanksgiving week. Which year? Always say which dates. Give me Nov 20 to Nov 30, 2026.",
    say: "Always say WHEN. Dates are written year-month-day, so they line up in order like words in a dictionary. BETWEEN includes both end days.",
    an: "'Shoes dropping Thanksgiving week' means nothing until you say which year.",
    ex: "SELECT release_date, name FROM releases\nWHERE release_date BETWEEN '2026-12-01' AND '2026-12-07';",
    ch: { q: "Show release_date and name for releases from 2026-11-20 to 2026-11-30 (both days included), earliest first.", sol: "SELECT release_date, name FROM releases WHERE release_date BETWEEN '2026-11-20' AND '2026-11-30' ORDER BY release_date;", order: 0,
      starter: { fill: "SELECT release_date, name FROM releases\nWHERE release_date BETWEEN '2026-11-20' AND '___'\nORDER BY release_date;", skeleton: "SELECT release_date, name FROM releases\nWHERE release_date BETWEEN '___' AND '___'\nORDER BY ___;" },
      hints: ["Write dates as 'YYYY-MM-DD' in quotes.", "BETWEEN '2026-11-20' AND '2026-11-30'", "SELECT release_date, name FROM releases WHERE release_date BETWEEN '2026-11-20' AND '2026-11-30' ORDER BY release_date;"] },
    py: "mask = releases['release_date'].between('2026-11-20', '2026-11-30')\nreleases.loc[mask, ['release_date', 'name']].sort_values('release_date')" },
  { d: 8, w: 2, t: "Missing prices", xp: 50, time: "11:30 AM",
    boss: "Some price tags on the wall are blank. List the shoes without a price so I can chase the brands.",
    say: "Some shoes don't have a price yet. Empty in SQL is called NULL. You can't use = NULL; you have to write IS NULL.",
    deep: "NULL means unknown. AVG and other totals skip NULLs, so COUNT(*) and COUNT(retail_usd) can be different.",
    an: "A box with a blank price sticker. It isn't free; nobody wrote the price yet.",
    ex: "SELECT name FROM releases WHERE colorway IS NULL;",
    ch: { q: "Show release_date and name for releases with no price listed.", sol: "SELECT release_date, name FROM releases WHERE retail_usd IS NULL;", starter: { fill: "SELECT release_date, name FROM releases WHERE retail_usd IS ___;", skeleton: "SELECT release_date, name FROM releases WHERE ___;" },
      hints: ["Use IS NULL, not = NULL.", "WHERE retail_usd IS NULL", "SELECT release_date, name FROM releases WHERE retail_usd IS NULL;"] },
    py: "releases.loc[releases['retail_usd'].isna(), ['release_date', 'name']]" },
  { d: 9, w: 2, t: "Count and average", xp: 60, time: "1:00 PM",
    boss: "The owner texts: 'How many drops are on the wall, and what's a typical price?' One answer, one row.",
    say: "COUNT counts rows. AVG finds the average (add them up, divide by how many). ROUND makes it tidy. AS gives the answer a name.",
    an: "Counting every box in the stack, then working out the typical price.",
    ex: "SELECT COUNT(*) AS releases, MIN(retail_usd) AS cheapest, MAX(retail_usd) AS priciest FROM releases;",
    ch: { q: "One row: how many releases there are (call it releases) and the average retail price rounded to whole dollars (call it avg_price).", sol: "SELECT COUNT(*) AS releases, ROUND(AVG(retail_usd)) AS avg_price FROM releases;",
      starter: { fill: "SELECT COUNT(*) AS releases, ROUND(AVG(___)) AS avg_price FROM releases;", skeleton: "SELECT ___ AS releases, ROUND(___) AS avg_price FROM releases;" },
      hints: ["COUNT(*) counts rows.", "ROUND(AVG(retail_usd))", "SELECT COUNT(*) AS releases, ROUND(AVG(retail_usd)) AS avg_price FROM releases;"] },
    py: "pd.Series({'releases': len(releases), 'avg_price': round(releases['retail_usd'].mean())})" },
  { d: 10, w: 2, t: "Group by brand", xp: 70, time: "2:45 PM",
    boss: "How much wall space does each brand need? Count each brand's drops and their average price.",
    say: "GROUP BY makes piles. Put every Nike in one pile, every Jordan in another, then count each pile.",
    deep: "One output row per group. Every column you SELECT must be in the GROUP BY or inside a total like COUNT or AVG.",
    an: "Sorting the boxes into piles by logo, then counting each pile.",
    ex: "SELECT brand, COUNT(*) AS drops FROM releases GROUP BY brand;",
    ch: { q: "For each brand: brand, number of releases (drops) and average price rounded (avg_price). Most drops first.", sol: "SELECT brand, COUNT(*) AS drops, ROUND(AVG(retail_usd)) AS avg_price FROM releases GROUP BY brand ORDER BY drops DESC;", order: 1,
      starter: { fill: "SELECT brand, COUNT(*) AS drops, ROUND(AVG(retail_usd)) AS avg_price\nFROM releases\nGROUP BY ___\nORDER BY drops DESC;", skeleton: "SELECT brand, ___ AS drops, ___ AS avg_price\nFROM releases\nGROUP BY ___\nORDER BY ___;" },
      hints: ["GROUP BY brand makes one row per brand.", "ORDER BY drops DESC", "SELECT brand, COUNT(*) AS drops, ROUND(AVG(retail_usd)) AS avg_price FROM releases GROUP BY brand ORDER BY drops DESC;"] },
    py: "(releases.groupby('brand')\n  .agg(drops=('name', 'size'), avg_price=('retail_usd', 'mean'))\n  .round().sort_values('drops', ascending=False))" },
  { d: 11, w: 2, t: "Drops per week", xp: 70, time: "4:10 PM",
    boss: "Which weeks will be crazy busy? I need to schedule extra staff. Count drops per week, then press Chart.",
    say: "strftime pulls pieces out of a date. '%Y-W%W' turns a date into a year and week number, so you can count drops each week.",
    deep: "'%Y-%m' gives the month. Turning dates into buckets is how you build a time series.",
    an: "Putting the boxes into one bin per week, then seeing which bin is fullest.",
    ex: "SELECT strftime('%Y-%m', release_date) AS month, COUNT(*) AS drops\nFROM releases GROUP BY month ORDER BY month;",
    ch: { q: "Count releases per week. Columns: week (use strftime('%Y-W%W', release_date)) and drops. Oldest week first.", sol: "SELECT strftime('%Y-W%W', release_date) AS week, COUNT(*) AS drops FROM releases GROUP BY week ORDER BY week;", order: 0,
      starter: { fill: "SELECT strftime('%Y-W%W', release_date) AS week, COUNT(*) AS drops\nFROM releases\nGROUP BY ___\nORDER BY week;", skeleton: "SELECT strftime('___', release_date) AS week, COUNT(*) AS drops\nFROM releases GROUP BY ___ ORDER BY ___;" },
      hints: ["Group by the week you made: GROUP BY week.", "strftime('%Y-W%W', release_date)", "SELECT strftime('%Y-W%W', release_date) AS week, COUNT(*) AS drops FROM releases GROUP BY week ORDER BY week;"] },
    py: "dates = pd.to_datetime(releases['release_date'])\nreleases.groupby(dates.dt.strftime('%Y-W%W')).size()" },
  { d: 12, w: 2, t: "Busy days (HAVING)", xp: 70, time: "6:00 PM",
    boss: "Line-around-the-block days: which dates have 5 or more drops? Those days we open early.",
    say: "WHERE filters boxes. HAVING filters piles, after you GROUP BY.",
    deep: "WHERE runs before grouping; HAVING runs after. You can't use COUNT() inside WHERE.",
    an: "After making a pile for each day, only keep the tall piles.",
    ex: "SELECT brand, COUNT(*) AS drops FROM releases GROUP BY brand HAVING COUNT(*) > 10;",
    ch: { q: "Show release_date and drops for days with 5 or more releases, busiest first.", sol: "SELECT release_date, COUNT(*) AS drops FROM releases GROUP BY release_date HAVING COUNT(*) >= 5 ORDER BY drops DESC;", order: 1,
      starter: { fill: "SELECT release_date, COUNT(*) AS drops\nFROM releases\nGROUP BY release_date\nHAVING COUNT(*) >= ___\nORDER BY drops DESC;", skeleton: "SELECT release_date, COUNT(*) AS drops FROM releases\nGROUP BY ___ HAVING ___ ORDER BY ___;" },
      hints: ["HAVING comes after GROUP BY.", "HAVING COUNT(*) >= 5", "SELECT release_date, COUNT(*) AS drops FROM releases GROUP BY release_date HAVING COUNT(*) >= 5 ORDER BY drops DESC;"] },
    py: "per_day = releases.groupby('release_date').size()\nper_day[per_day >= 5].sort_values(ascending=False)" },

  { d: 13, w: 3, t: "Meet the sales log", xp: 60, time: "10:00 AM",
    boss: "Promotion! You're in consignment now. People bring us shoes, we sell them, we keep a cut. Here's our sales log. It's PRACTICE data with made-up brands, Aug 1 to Oct 31, 2026. How many pairs did we sell in September?",
    say: "shoes has one row per shoe we carry. sales has one row per pair sold, with the date, size and price.",
    deep: "shoes is a 'dimension' table (things); sales is a 'fact' table (events). Facts point at things with shoe_id.",
    an: "One notebook lists every shoe. Another notebook lists every time someone bought a pair.",
    ex: "SELECT * FROM shoes LIMIT 5;\n-- then try: SELECT * FROM sales LIMIT 5;",
    ch: { q: "How many sales happened in September 2026? One column: sales.", sol: "SELECT COUNT(*) AS sales FROM sales WHERE sale_date BETWEEN '2026-09-01' AND '2026-09-30';",
      starter: { fill: "SELECT COUNT(*) AS sales FROM sales\nWHERE sale_date BETWEEN '2026-09-01' AND '___';", skeleton: "SELECT COUNT(*) AS sales FROM sales WHERE ___;" },
      hints: ["September has 30 days.", "BETWEEN '2026-09-01' AND '2026-09-30'", "SELECT COUNT(*) AS sales FROM sales WHERE sale_date BETWEEN '2026-09-01' AND '2026-09-30';"] },
    py: "sales = pd.read_csv('sales.csv')\nsales['sale_date'].between('2026-09-01', '2026-09-30').sum()" },
  { d: 14, w: 3, t: "JOIN two tables", xp: 90, time: "11:45 AM",
    boss: "The sales log only says shoe_id 10, shoe_id 17… nobody knows what that is. Glue the names on and show each shoe's sales and average price.",
    say: "sales only knows a shoe_id number. JOIN glues each sale to its shoe so you can see the name. ON says which column matches.",
    deep: "INNER JOIN keeps rows where the key matches on both sides. Short aliases (s, sh) keep it readable. Ask: what's the key, and is it one-to-many?",
    an: "Matching each receipt to the shoe box with the same number.",
    ex: "SELECT s.sale_date, sh.model, sh.colorway, s.price_usd\nFROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id\nLIMIT 5;",
    ch: { q: "For each shoe: model, colorway, number of sales (sales) and average resale price rounded (avg_price). Most sales first.", sol: "SELECT sh.model, sh.colorway, COUNT(*) AS sales, ROUND(AVG(s.price_usd)) AS avg_price FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id ORDER BY sales DESC;", order: 2,
      starter: { fill: "SELECT sh.model, sh.colorway, COUNT(*) AS sales, ROUND(AVG(s.price_usd)) AS avg_price\nFROM sales s JOIN shoes sh ON s.shoe_id = sh.___\nGROUP BY sh.shoe_id\nORDER BY sales DESC;", skeleton: "SELECT sh.model, sh.colorway, ___ AS sales, ___ AS avg_price\nFROM sales s JOIN shoes sh ON ___\nGROUP BY ___ ORDER BY ___;" },
      hints: ["The matching column is shoe_id in both tables.", "GROUP BY sh.shoe_id gives one row per shoe.", "SELECT sh.model, sh.colorway, COUNT(*) AS sales, ROUND(AVG(s.price_usd)) AS avg_price FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id ORDER BY sales DESC;"] },
    py: "df = sales.merge(shoes, on='shoe_id')\n(df.groupby(['shoe_id', 'model', 'colorway'])\n  .agg(sales=('sale_id', 'size'), avg_price=('price_usd', 'mean'))\n  .round().sort_values('sales', ascending=False))" },
  { d: 15, w: 3, t: "Heat or brick? (CASE)", xp: 90, time: "2:00 PM",
    boss: "Consigners ask: 'Is my shoe heat or a brick?' Work out each shoe's premium and stamp it HEAT, FAIR or BRICK.",
    say: "Premium = resale price minus store price. Positive means it sells for more than the store price (heat). Negative means less (brick). CASE lets you write your own labels.",
    deep: "Use premium as a percent of retail so cheap and expensive shoes compare fairly. CASE WHEN … THEN … ELSE … END.",
    an: "If the shoe sells for more than the store price, stamp it HEAT. Less, stamp it BRICK.",
    ex: "SELECT model, colorway, retail_usd,\n  CASE WHEN hype >= 8 THEN 'hyped' ELSE 'chill' END AS vibe\nFROM shoes;",
    ch: { q: "For each shoe: model, colorway, premium_pct = ROUND(100.0 * (AVG(price_usd) - retail_usd) / retail_usd) and label: 'HEAT' if premium_pct >= 20, 'FAIR' if >= 0, else 'BRICK'. Highest premium first.", sol: "SELECT sh.model, sh.colorway, ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) AS premium_pct, CASE WHEN ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) >= 20 THEN 'HEAT' WHEN ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) >= 0 THEN 'FAIR' ELSE 'BRICK' END AS label FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id ORDER BY premium_pct DESC;", order: 2,
      starter: { fill: "SELECT sh.model, sh.colorway,\n  ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) AS premium_pct,\n  CASE WHEN ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) >= 20 THEN 'HEAT'\n       WHEN ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) >= 0 THEN '___'\n       ELSE 'BRICK' END AS label\nFROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id\nGROUP BY sh.shoe_id\nORDER BY premium_pct DESC;", skeleton: "SELECT sh.model, sh.colorway,\n  ROUND(100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd) AS premium_pct,\n  CASE WHEN ___ THEN 'HEAT' WHEN ___ THEN 'FAIR' ELSE 'BRICK' END AS label\nFROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id\nGROUP BY ___ ORDER BY ___;" },
      hints: ["Repeat the premium formula inside CASE (SQLite also lets you reuse the alias).", "WHEN … >= 20 THEN 'HEAT' WHEN … >= 0 THEN 'FAIR' ELSE 'BRICK'", "Press 'Head start' for the full answer with one blank."] },
    py: "g = df.groupby(['shoe_id', 'model', 'colorway', 'retail_usd'])['price_usd'].mean().reset_index()\ng['premium_pct'] = (100 * (g['price_usd'] - g['retail_usd']) / g['retail_usd']).round()\ng['label'] = pd.cut(g['premium_pct'], [-1e9, -0.5, 19.5, 1e9], labels=['BRICK', 'FAIR', 'HEAT'])" },
  { d: 16, w: 3, t: "Beat the average (WITH)", xp: 100, time: "3:30 PM",
    boss: "Which shoes sell for more than our average sale? Those get the glass case by the door.",
    say: "WITH lets you make a mini-table first, give it a name, then use it. Work out each shoe's average, then keep the ones above the store-wide average.",
    deep: "CTEs (WITH name AS (…)) break a problem into named steps. A subquery like (SELECT AVG(…) FROM …) returns one number you can compare against.",
    an: "First work out the class average, then find who scored above it.",
    ex: "WITH per_shoe AS (\n  SELECT shoe_id, AVG(price_usd) AS avg_price FROM sales GROUP BY shoe_id\n)\nSELECT * FROM per_shoe ORDER BY avg_price DESC LIMIT 3;",
    ch: { q: "Using WITH, list model, colorway and avg_price (rounded) for shoes whose average sale price is above the average of ALL sales. Highest first.", sol: "WITH per_shoe AS (SELECT shoe_id, AVG(price_usd) AS avg_price FROM sales GROUP BY shoe_id) SELECT sh.model, sh.colorway, ROUND(p.avg_price) AS avg_price FROM per_shoe p JOIN shoes sh ON sh.shoe_id = p.shoe_id WHERE p.avg_price > (SELECT AVG(price_usd) FROM sales) ORDER BY p.avg_price DESC;", order: 2,
      starter: { fill: "WITH per_shoe AS (\n  SELECT shoe_id, AVG(price_usd) AS avg_price FROM sales GROUP BY shoe_id\n)\nSELECT sh.model, sh.colorway, ROUND(p.avg_price) AS avg_price\nFROM per_shoe p JOIN shoes sh ON sh.shoe_id = p.shoe_id\nWHERE p.avg_price > (SELECT AVG(___) FROM sales)\nORDER BY p.avg_price DESC;", skeleton: "WITH per_shoe AS (\n  SELECT shoe_id, AVG(price_usd) AS avg_price FROM sales GROUP BY ___\n)\nSELECT ___\nFROM per_shoe p JOIN shoes sh ON ___\nWHERE p.avg_price > (___)\nORDER BY ___;" },
      hints: ["The overall average is (SELECT AVG(price_usd) FROM sales).", "Join per_shoe to shoes on shoe_id to get names.", "Press 'Head start' and fill price_usd."] },
    py: "per_shoe = sales.groupby('shoe_id')['price_usd'].mean()\nabove = per_shoe[per_shoe > sales['price_usd'].mean()]\nshoes.set_index('shoe_id').loc[above.index, ['model', 'colorway']].assign(avg_price=above.round())" },
  { d: 17, w: 3, t: "Rank the brands", xp: 120, time: "5:45 PM",
    boss: "End of the quarter. Rank the brands by how much money they made us. Medal ceremony!",
    say: "Window functions look at the whole table without squishing rows together. RANK() hands out 1st, 2nd, 3rd place.",
    deep: "RANK() OVER (ORDER BY …) ranks; SUM(…) OVER (PARTITION BY … ORDER BY …) makes running totals; AVG over ROWS BETWEEN 6 PRECEDING AND CURRENT ROW is a 7-row moving average.",
    an: "Handing out medals while everyone stays in line.",
    ex: "SELECT sale_date, price_usd,\n  AVG(price_usd) OVER (ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg\nFROM sales WHERE shoe_id = 10 LIMIT 15;",
    ch: { q: "Rank brands by total sales money in the period. Columns: brand, revenue (SUM of price_usd), place (RANK by revenue, highest = 1). Order by place.", sol: "SELECT sh.brand, SUM(s.price_usd) AS revenue, RANK() OVER (ORDER BY SUM(s.price_usd) DESC) AS place FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.brand ORDER BY place;", order: 2,
      starter: { fill: "SELECT sh.brand, SUM(s.price_usd) AS revenue,\n  RANK() OVER (ORDER BY SUM(s.price_usd) ___) AS place\nFROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id\nGROUP BY sh.brand\nORDER BY place;", skeleton: "SELECT sh.brand, SUM(s.price_usd) AS revenue,\n  RANK() OVER (___) AS place\nFROM sales s JOIN shoes sh ON ___\nGROUP BY ___ ORDER BY ___;" },
      hints: ["Highest revenue gets place 1, so DESC.", "RANK() OVER (ORDER BY SUM(s.price_usd) DESC)", "Press 'Head start' and fill DESC."] },
    py: "rev = df.groupby('brand')['price_usd'].sum().sort_values(ascending=False)\nrev.to_frame('revenue').assign(place=rev.rank(ascending=False, method='min'))" },

  { d: 18, w: 4, t: "Python: lists and loops", type: "quiz", xp: 70, time: "10:00 AM",
    boss: "I'm Theo, the data lead. Upstairs we use Python too: it does everything SQL does, plus cleaning, charts and machine learning. Let's start simple. Read each snippet and say what it prints.",
    say: "A list holds many values in order, like a stack of price tags. A for loop visits each one. Python counts positions from 0.",
    deep: "Run every snippet yourself in the notebook kit (Back office → Download the kit), lesson 01.",
    an: "A list is a row of shoe boxes. A loop is walking past each box and reading its tag.",
    quiz: [
      { code: "prices = [130, 215, 255]\nprint(prices[0])", q: "What prints?", o: ["130", "215", "[130]", "an error"], w: "Positions start at 0, so prices[0] is the first item." },
      { code: "prices = [130, 215, 255]\nprint(len(prices))", q: "What prints?", o: ["3", "2", "600", "255"], w: "len() counts the items." },
      { code: "total = 0\nfor p in [130, 215, 255]:\n    total = total + p\nprint(total)", q: "What prints?", o: ["600", "255", "130215255", "0"], w: "The loop adds each price to total: 130 + 215 + 255 = 600." },
      { code: "for p in [130, 215, 255]:\n    if p > 200:\n        print('heat', p)", q: "What prints?", o: ["heat 215, then heat 255", "heat 130, heat 215 and heat 255", "only heat 255", "nothing"], w: "Only prices above 200 pass the if: 215 and 255." },
      { code: "print([p * 2 for p in [10, 20]])", q: "What prints?", o: ["[20, 40]", "[10, 20, 10, 20]", "60", "[10, 20]"], w: "A list comprehension builds a new list by applying p * 2 to each item." }
    ] },
  { d: 19, w: 4, t: "Python: dictionaries and functions", type: "quiz", xp: 70, time: "11:30 AM",
    boss: "A dictionary is how Python stores a shoe's label. A function is a recipe you can reuse. These two run half our scripts.",
    say: "A dictionary matches names to values, like 'price' → 230. A function takes inputs and gives back an answer with return.",
    deep: "Notebook kit lesson 01 has every snippet ready to run and change.",
    an: "A dictionary is a shoe box label: each line has a name and a value. A function is a calculator button you made yourself.",
    quiz: [
      { code: "shoe = {'name': 'Air Jordan 4', 'price': 230}\nprint(shoe['price'])", q: "What prints?", o: ["230", "price", "Air Jordan 4", "an error"], w: "shoe['price'] looks up the value stored under 'price'." },
      { code: "def premium(resale, retail):\n    return resale - retail\n\nprint(premium(300, 230))", q: "What prints?", o: ["70", "530", "-70", "premium"], w: "The function returns 300 - 230 = 70." },
      { code: "shoe = {'name': 'Air Jordan 4', 'price': 230}\nshoe['size'] = 10\nprint(len(shoe))", q: "What prints?", o: ["3", "2", "10", "an error"], w: "Adding 'size' makes three keys: name, price, size." },
      { code: "stock = {'AJ4': 3, 'Kobe 8': 0}\nprint([k for k, v in stock.items() if v == 0])", q: "What prints?", o: ["['Kobe 8']", "['AJ4']", "[0]", "{'Kobe 8': 0}"], w: "items() gives name/value pairs; only Kobe 8 has 0 in stock." },
      { code: "print(round(2 / 3, 2))", q: "What prints?", o: ["0.67", "0.66", "1", "0.6666"], w: "round(x, 2) keeps two decimal places, rounding 0.666… up to 0.67." }
    ] },
  { d: 20, w: 4, t: "pandas: SQL's twin", type: "quiz", xp: 80, time: "1:15 PM",
    boss: "Everything you did downstairs in SQL has a pandas version. Match each SQL query to the pandas code that does the same thing.",
    say: "pandas is a Python library for tables. A table in pandas is called a DataFrame. Same ideas as SQL, different words.",
    deep: "Notebook kit lesson 02 runs every pair side by side on the real release data.",
    an: "SQL and pandas are two languages that say the same thing, like 'hello' and 'hola'.",
    quiz: [
      { code: "SELECT name, retail_usd FROM releases;", q: "Which pandas line does the same?", o: ["releases[['name', 'retail_usd']]", "releases.name.retail_usd", "releases.select('name')", "releases.head()"], w: "Double brackets with a list of column names picks those columns." },
      { code: "SELECT * FROM releases WHERE brand = 'Nike';", q: "Which pandas line does the same?", o: ["releases[releases['brand'] == 'Nike']", "releases.where('Nike')", "releases['Nike']", "releases.brand = 'Nike'"], w: "A True/False mask inside brackets keeps the matching rows." },
      { code: "SELECT * FROM releases ORDER BY retail_usd DESC;", q: "Which pandas line does the same?", o: ["releases.sort_values('retail_usd', ascending=False)", "releases.sort('retail_usd')", "releases.order_by('retail_usd')", "releases.max('retail_usd')"], w: "sort_values with ascending=False is ORDER BY … DESC." },
      { code: "SELECT brand, COUNT(*) FROM releases GROUP BY brand;", q: "Which pandas line does the same?", o: ["releases.groupby('brand').size()", "releases.count('brand')", "releases['brand'].sum()", "releases.group('brand')"], w: "groupby makes the piles; size() counts rows in each pile." },
      { code: "SELECT * FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id;", q: "Which pandas line does the same?", o: ["sales.merge(shoes, on='shoe_id')", "sales + shoes", "sales.join('shoes')", "pd.concat([sales, shoes])"], w: "merge on a key column is a JOIN. concat just stacks tables." }
    ] },
  { d: 21, w: 4, t: "How spread out? (analytics)", xp: 100, time: "3:00 PM",
    boss: "The owner says 'our average sale is $135, great!' But averages hide stuff. Show me how sale prices are spread out.",
    say: "An average hides a lot. A histogram counts how many sales fall in each price bucket. Make $50 buckets, then press Chart.",
    deep: "Look for skew and outliers before trusting a mean. Median (the middle value) is often more honest for prices.",
    an: "Sorting coins into jars of $0–49, $50–99… and seeing which jar is fullest.",
    ex: "SELECT MIN(price_usd), ROUND(AVG(price_usd)), MAX(price_usd) FROM sales;",
    ch: { q: "Histogram of sale prices: bucket = CAST(price_usd / 50 AS INTEGER) * 50, and sales = how many in each bucket. Lowest bucket first.", sol: "SELECT CAST(price_usd / 50 AS INTEGER) * 50 AS bucket, COUNT(*) AS sales FROM sales GROUP BY bucket ORDER BY bucket;", order: 0,
      starter: { fill: "SELECT CAST(price_usd / 50 AS INTEGER) * 50 AS bucket, COUNT(*) AS sales\nFROM sales\nGROUP BY ___\nORDER BY bucket;", skeleton: "SELECT ___ AS bucket, COUNT(*) AS sales FROM sales GROUP BY ___ ORDER BY ___;" },
      hints: ["Group by the bucket you made.", "GROUP BY bucket ORDER BY bucket", "SELECT CAST(price_usd / 50 AS INTEGER) * 50 AS bucket, COUNT(*) AS sales FROM sales GROUP BY bucket ORDER BY bucket;"] },
    py: "import matplotlib.pyplot as plt\nsales['price_usd'].plot.hist(bins=range(0, 450, 50))\nplt.xlabel('sale price (USD)'); plt.show()\nsales['price_usd'].median()" },
  { d: 22, w: 4, t: "Clean it, chart it (notebook)", type: "quiz", kit: true, xp: 100, time: "4:45 PM",
    boss: "Real data is messy. Download our notebook kit, open lesson 03 in Google Colab, clean the release list and draw a chart. Then tell me what you learned.",
    say: "A notebook mixes notes, code and charts in one page. Google Colab runs Python notebooks free in your browser: no install.",
    deep: "Open colab.research.google.com → Upload → choose a .ipynb from the kit, then drag the three .csv files into the Files panel on the left.",
    an: "A notebook is a lab journal where the experiments actually run.",
    quiz: [
      { q: "Some retail prices are missing (NaN in pandas). What's the honest first step?", o: ["Count them and decide on purpose: drop them or keep them as unknown", "Replace them all with 0", "Delete the whole table", "Make up typical prices"], w: "Missing isn't zero. Decide deliberately and say what you did." },
      { code: "releases['release_date'] = pd.to_datetime(releases['release_date'])", q: "Why do this?", o: ["So pandas treats the column as dates (weeks, months, sorting) instead of plain text", "To delete the dates", "To make the file smaller", "It's required to print"], w: "Real date types unlock .dt.month, .dt.isocalendar() and time charts." },
      { q: "A chart of drops per week should have…", o: ["weeks in time order on the x-axis and a title with the date range", "random week order", "no labels", "only the biggest week"], w: "Time goes left to right, and the title says which period." },
      { q: "Your chart shows 34 drops in week 44. What should the caption say?", o: ["Which source, which dates, and when the list was checked", "Nothing, the chart speaks", "That every week is like this", "The exact sales for each drop"], w: "Always name the source and time period." }
    ] },

  { d: 23, w: 5, t: "Line of best fit (SQL)", xp: 150, time: "10:00 AM",
    boss: "Welcome to the AI lab. First question: does hype predict how much a shoe sells over retail? Draw the straightest line through the dots, using only SQL.",
    say: "A line of best fit is the simplest model. Its slope says how much the premium goes up for each extra point of hype.",
    deep: "slope = covariance(x,y) / variance(x); intercept = mean(y) − slope × mean(x). Correlation isn't causation, and hype here is a made-up score.",
    an: "Drawing one straight line through a cloud of dots so you can guess where the next dot will land.",
    ex: "WITH p AS (\n  SELECT sh.hype AS x, 100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd AS y\n  FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id\n)\nSELECT x AS hype, ROUND(y) AS premium_pct FROM p ORDER BY x;",
    ch: { q: "Fit premium_pct = intercept + slope × hype across the 20 shoes. Return one row: slope and intercept, each rounded to 1 decimal.", sol: "WITH p AS (SELECT sh.hype AS x, 100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd AS y FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id), m AS (SELECT AVG(x) AS mx, AVG(y) AS my FROM p), f AS (SELECT SUM((x - mx) * (y - my)) / SUM((x - mx) * (x - mx)) AS slope, mx, my FROM p, m) SELECT ROUND(slope, 1) AS slope, ROUND(my - slope * mx, 1) AS intercept FROM f;",
      starter: { fill: "WITH p AS (\n  SELECT sh.hype AS x, 100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd AS y\n  FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id\n),\nm AS (SELECT AVG(x) AS mx, AVG(y) AS my FROM p),\nf AS (SELECT SUM((x - mx) * (y - my)) / SUM((x - mx) * (x - mx)) AS slope, mx, my FROM p, m)\nSELECT ROUND(slope, 1) AS slope, ROUND(my - slope * ___, 1) AS intercept FROM f;", skeleton: "WITH p AS (\n  SELECT sh.hype AS x, 100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd AS y\n  FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id\n),\nm AS (SELECT AVG(x) AS mx, AVG(y) AS my FROM p),\nf AS (SELECT ___ AS slope, mx, my FROM p, m)\nSELECT ROUND(slope, 1) AS slope, ROUND(___, 1) AS intercept FROM f;" },
      hints: ["slope = SUM((x-mx)*(y-my)) / SUM((x-mx)*(x-mx))", "intercept = my - slope * mx", "Press 'Head start' and fill mx."] },
    py: "from sklearn.linear_model import LinearRegression\np = df.groupby(['shoe_id', 'hype', 'retail_usd'])['price_usd'].mean().reset_index()\np['premium_pct'] = 100 * (p['price_usd'] - p['retail_usd']) / p['retail_usd']\nm = LinearRegression().fit(p[['hype']], p['premium_pct'])\nm.coef_[0], m.intercept_" },
  { d: 24, w: 5, t: "Teach a model (gradient descent)", type: "lab", lab: "gd", xp: 150, time: "11:30 AM",
    boss: "Yesterday you used a formula. Real machine learning finds the line by trial and error: guess, check the mistake, nudge, repeat. Train it yourself and watch it learn.",
    say: "Gradient descent starts with a bad line and improves it a little each step. The 'loss' is how wrong the line is. Learning means the loss goes down.",
    deep: "Each step moves the slope and intercept against the gradient of mean squared error. The learning rate sets the step size: too small is slow, too big overshoots and blows up.",
    an: "Finding the bottom of a dark valley by feeling which way is downhill and taking small steps.",
    check: { q: "What happened with the 'too big' learning rate?", o: ["The loss blew up: each step overshot the bottom", "It learned fastest and best", "Nothing changed", "It found a different, better line"], w: "Too-big steps jump past the bottom and get farther away each time." } },
  { d: 25, w: 5, t: "Heat detector (decision tree)", type: "lab", lab: "tree", xp: 180, time: "1:30 PM",
    boss: "When a consigner walks in, can we predict on the spot if their pair will sell for 20%+ over retail? Train a decision tree on our sales log, and test it fairly.",
    say: "A decision tree asks yes/no questions (Is hype at least 7? Is the size 13+?) until it can guess HEAT or NOT. We train on 80% of sales and test on the other 20% it has never seen.",
    deep: "This is classification. Test accuracy is the honest score. A very deep tree memorizes the training rows (overfitting): training accuracy goes up while test accuracy stalls or drops.",
    an: "Twenty Questions for shoes. Practice on some cards, then get quizzed on new cards.",
    check: { q: "Which tree depth should the store actually use?", o: ["The one with the best TEST accuracy", "The deepest one, because training accuracy is highest", "Depth 1, always", "Whichever trains fastest"], w: "Test accuracy shows how it does on pairs it hasn't seen, which is what happens at the counter." } },
  { d: 26, w: 5, t: "Customer groups (k-means)", type: "lab", lab: "kmeans", xp: 150, time: "3:15 PM",
    boss: "Marketing wants to send different emails to different kinds of buyers. Nobody labeled them. Can a model find natural groups on its own?",
    say: "k-means finds groups without labels. You pick how many groups (k). It drops k centers, assigns every sale to the nearest center, moves each center to the middle of its group, and repeats.",
    deep: "This is unsupervised learning. We cluster on shoe size and price ÷ retail (scaled so both count equally). Different k gives different stories; there's no single 'right' k.",
    an: "Sorting a pile of mixed Legos into groups that look alike, without anyone telling you the groups.",
    check: { q: "What does k-means need from you?", o: ["How many groups (k) to look for", "The right answer for every sale", "A list of customer names", "Nothing at all"], w: "You choose k; the model finds the groups. No labels needed." } },
  { d: 27, w: 5, t: "Your AI teammate", xp: 120, time: "4:30 PM",
    boss: "We use an AI assistant to draft SQL. It's fast, and sometimes confidently wrong. It wrote this query for 'all Jordan releases in December 2026' and got zero rows. Find the bug and fix it.",
    say: "AI chat tools (large language models) write text and code by predicting likely words. Machine learning models like your tree learn from our own data. Both can be wrong, so you check the output.",
    deep: "Verify AI-written queries: run them, check row counts, check values against the data. Never paste secrets into an AI. The store's models only know the period they were trained on.",
    an: "An AI helper is like a fast new coworker who never says 'I'm not sure'. Double-check their work.",
    ex: "-- AI draft (has a bug):\nSELECT release_date, name, retail_usd\nFROM releases\nWHERE brand = 'Air Jordan'\n  AND release_date BETWEEN '2026-12-01' AND '2026-12-31';",
    ch: { q: "Fix the AI's query so it returns every Jordan release in December 2026: release_date, name, retail_usd.", sol: "SELECT release_date, name, retail_usd FROM releases WHERE brand = 'Jordan' AND release_date BETWEEN '2026-12-01' AND '2026-12-31';",
      starter: { fill: "SELECT release_date, name, retail_usd\nFROM releases\nWHERE brand = '___'\n  AND release_date BETWEEN '2026-12-01' AND '2026-12-31';", skeleton: "SELECT release_date, name, retail_usd\nFROM releases\nWHERE brand = 'Air Jordan'\n  AND release_date BETWEEN '2026-12-01' AND '2026-12-31';" },
      hints: ["Run SELECT DISTINCT brand FROM releases; to see how brands are spelled.", "The data says 'Jordan', not 'Air Jordan'.", "WHERE brand = 'Jordan' AND release_date BETWEEN '2026-12-01' AND '2026-12-31'"] },
    py: "releases['brand'].unique()  # always look at the real values before you filter" },
  { d: 28, w: 5, t: "Where data comes from", type: "quiz", xp: 80, time: "5:30 PM",
    boss: "Last lesson before you run a shift alone: where our numbers come from, and the rules for collecting them.",
    say: "The release calendar here is real. A scheduled helper checks a public release calendar every day and writes down what it finds, with the date it checked. Websites have rules about robots, and good data people follow them.",
    deep: "Official APIs (documented, keyed, rate-limited) beat scraping (fragile, and often against a site's terms). Marketplaces like StockX and GOAT don't allow automated scraping. Always record source, collection time and coverage window.",
    an: "Copying the lunch menu off the school board every morning, and writing the date at the top.",
    quiz: [
      { q: "Why does every dataset here show a date range and a 'checked on' time?", o: ["So you know what period the numbers cover and how fresh they are", "It looks cool", "Computers need it to run", "To make the table longer"], w: "Release dates change. 'Nov 21' means nothing without the year and when someone checked." },
      { q: "A site's terms say 'no automated scraping'. What do you do?", o: ["Use an official API or a source that allows it", "Scrape it faster", "Pretend to be a person", "Scrape at night"], w: "Follow the rules: official APIs, open data, or sources that permit it." },
      { q: "Can you copy product photos from a sneaker news site onto your own page?", o: ["Not without permission: they're copyrighted. Link to the article instead", "Yes, if it's for school", "Yes, if you resize them", "Yes, everything online is free"], w: "Photos belong to whoever took them. Linking is fine; copying needs permission." },
      { q: "An API key is like…", o: ["a password: keep it secret, never in public code", "a username anyone can see", "the price of a shoe", "a type of SQL"], w: "Keys identify you. Leaked keys get abused." },
      { q: "The sales log in week 3 is…", o: ["practice data made up for learning", "real StockX prices", "real store prices", "live auction data"], w: "Practice data. The release calendar is real; the sales log is practice." }
    ] },
  { d: 29, w: 5, t: "Run the store (capstone)", type: "free", xp: 250, time: "6:00 PM",
    boss: "You've earned the keys. Pick a real question the store has, answer it with data, and give me a one-sentence finding with the time period. Then you're Store Legend.",
    say: "Ask your own question, write the SQL, chart it if it helps, and explain the answer in one or two sentences. Say which time period you used and which data (real or practice).",
    an: "Your science fair project: a question, a test, an answer, and what you'd check next.",
    ex: "-- Ideas:\n-- Which week in December has the most Jordan releases?\n-- Do bigger sizes resell for more? (sales.size_us)\n-- Which brand has the most HEAT shoes?\nSELECT size_us, ROUND(AVG(price_usd)) AS avg_price, COUNT(*) AS sales\nFROM sales GROUP BY size_us ORDER BY size_us;" },
  { d: 30, w: 5, t: "Grail Day (final review)", type: "quiz", xp: 200, time: "7:00 PM",
    boss: "Big Face counts the jar twice. Big face hundreds, finally enough for the grail. Rae stops him at the register: \"One last thing. Mixed questions from every week, no notes. Then the Comet Mid is yours.\"",
    say: "A final review mixes questions from all five weeks: SQL, Python, data, machine learning and AI. Pulling an idea back out of memory, after time has passed and mixed in with other ideas, is one of the best-studied ways to make it stick.",
    deep: "If one question stumps you, that's useful information, not failure. Go back to that day, reread the big idea, then come back. Each question links to a week below in its explanation.",
    an: "Like the end-of-season game: every play you practiced, all in one night.",
    quiz: [
      { q: "Week 1–2 · Which query finds releases that have no price yet?", o: ["SELECT name FROM releases WHERE retail_usd IS NULL;", "SELECT name FROM releases WHERE retail_usd = NULL;", "SELECT name FROM releases WHERE retail_usd = 0;", "SELECT name FROM releases WHERE retail_usd = '';"], w: "Missing values are NULL, and you test them with IS NULL. = NULL never matches anything, and 0 is a real price. (Day 8)" },
      { q: "Week 2 · You want only brands with at least 5 releases. Which part filters the groups?", o: ["HAVING COUNT(*) >= 5", "WHERE COUNT(*) >= 5", "ORDER BY COUNT(*) >= 5", "LIMIT 5"], w: "WHERE filters rows before grouping. HAVING filters the groups after GROUP BY. (Day 12)" },
      { q: "Week 3 · sales has shoe_id. shoes has shoe_id and model. To show each sale next to its model you…", o: ["JOIN shoes ON sales.shoe_id = shoes.shoe_id", "SELECT both tables and hope", "GROUP BY shoe_id", "Copy the model into every sale by hand"], w: "A JOIN matches rows that share a key. shoe_id is the key both tables have. (Week 3)" },
      { q: "Week 4 · What prints?", code: "closet = [\"Glide 1\", \"Dash 5\"]\ncloset.append(\"Comet Mid\")\nprint(closet[-1])", o: ["Comet Mid", "Glide 1", "Dash 5", "3"], w: ".append() adds to the end, and [-1] is the last item. (Day 18 Python corner)" },
      { q: "Week 4 · What prints?", code: "prices = [120, 300, 90]\nprint([p for p in prices if p > 100])", o: ["[120, 300]", "[90]", "[120, 300, 90]", "2"], w: "The comprehension keeps only prices over 100, in their original order. (Day 20 Python corner)" },
      { q: "Week 4 · What prints?", code: "pair = {\"model\": \"Comet Mid\", \"paid\": 410}\nprint(pair.get(\"hype\", 0))", o: ["0", "An error", "None", "410"], w: ".get(key, default) gives the default when the key is missing, so no KeyError. (Day 19)" },
      { q: "Week 4 · Most sales are about $165, but one was $5,000. Which number best shows a typical sale?", o: ["The median", "The mean (average)", "The max", "The range"], w: "One huge outlier drags the mean up. The median is the middle value, so one outlier barely moves it. (Day 21)" },
      { q: "Week 5 · The heat detector scores 90% accuracy, but 90% of shoes are bricks. That means…", o: ["It might be no better than always guessing 'brick'", "It's an amazing model", "Accuracy can't be 90%", "It needs more hype"], w: "Always compare to the baseline: the score you'd get by guessing the most common answer every time. (Day 25)" },
      { q: "Week 5 · The AI says there are 12 Jordan releases in December. Best next step?", o: ["Run a COUNT(*) query yourself and compare", "Trust it, AI is always right", "Post it on the blog", "Ask the AI if it's sure"], w: "Check an AI's numbers against the data. Asking it again isn't checking. (Day 27)" }
    ] }
];

/* How the store's data stack fits together (the "store map"). */
const STACK = [
  { id: "feed", n: 1, t: "Release calendar", tool: "Data collection", what: "A scheduled helper reads a public release calendar daily and records date, brand, price, plus when it checked.", days: [28], k: "real" },
  { id: "db", n: 2, t: "Store database", tool: "SQL", what: "Releases, shoes and the sales log live in tables. SQL answers the everyday questions at the counter.", days: [2, 7, 14], k: "sql" },
  { id: "py", n: 3, t: "Notebooks", tool: "Python + pandas", what: "The same tables in Python: clean messy data, combine sources, automate reports.", days: [18, 20, 22], k: "py" },
  { id: "dash", n: 4, t: "Charts + reports", tool: "Data analytics", what: "Histograms, weekly trends and the blog's Drop Report turn numbers into decisions (staffing, shelf space).", days: [11, 21], k: "py" },
  { id: "ml", n: 5, t: "Prediction models", tool: "Machine learning", what: "Models trained on our sales log: a price line, a heat detector, customer groups. They run right in this page.", days: [24, 25, 26], k: "ml" },
  { id: "ai", n: 6, t: "AI teammate", tool: "Generative AI", what: "An AI assistant drafts SQL and explains results. Staff check its work before trusting it.", days: [27], k: "ai" }
];

/* Notebook kit for Google Colab / Jupyter. Cells: ["md"|"code", text]. */
const NOTEBOOKS = [
  { file: "01_python_basics.ipynb", title: "Lesson 01 · Python basics at the Grail Room", cells: [
    ["md", "# Lesson 01 · Python basics\nGrail Room back office, week 4. Run each cell with **Shift+Enter**, then change things and run again."],
    ["code", "prices = [130, 215, 255]\nprint(prices[0], len(prices))"],
    ["code", "total = 0\nfor p in prices:\n    total = total + p\nprint('total', total)\nprint('average', total / len(prices))"],
    ["code", "for p in prices:\n    if p > 200:\n        print('heat', p)"],
    ["code", "doubled = [p * 2 for p in prices]\ndoubled"],
    ["code", "shoe = {'name': 'Air Jordan 4', 'price': 230}\nshoe['size'] = 10\nprint(shoe, len(shoe))"],
    ["code", "def premium(resale, retail):\n    return resale - retail\n\npremium(300, 230)"],
    ["md", "**Your turn:** write a function `premium_pct(resale, retail)` that returns the premium as a percent, rounded to 1 decimal."]
  ] },
  { file: "02_pandas_like_sql.ipynb", title: "Lesson 02 · pandas is SQL's twin", cells: [
    ["md", "# Lesson 02 · pandas is SQL's twin\nFirst drag `releases.csv`, `shoes.csv` and `sales.csv` into the Files panel (Colab) or the same folder (Jupyter).\n\n`releases.csv` is the REAL release calendar as of the date in the file. `shoes.csv` and `sales.csv` are PRACTICE data (made-up brands, Aug 1 – Oct 31, 2026)."],
    ["code", "import pandas as pd\nreleases = pd.read_csv('releases.csv')\nshoes = pd.read_csv('shoes.csv')\nsales = pd.read_csv('sales.csv')\nreleases.head()"],
    ["code", "# SELECT name, retail_usd FROM releases\nreleases[['name', 'retail_usd']].head()"],
    ["code", "# WHERE brand = 'adidas'\nreleases[releases['brand'] == 'adidas']"],
    ["code", "# ORDER BY retail_usd DESC LIMIT 5\nreleases.sort_values('retail_usd', ascending=False).head(5)[['name', 'retail_usd']]"],
    ["code", "# GROUP BY brand\nreleases.groupby('brand').agg(drops=('name', 'size'), avg_price=('retail_usd', 'mean')).round()"],
    ["code", "# JOIN\ndf = sales.merge(shoes, on='shoe_id')\ndf.groupby(['model', 'colorway'])['price_usd'].agg(['count', 'mean']).round().sort_values('count', ascending=False)"]
  ] },
  { file: "03_clean_and_chart.ipynb", title: "Lesson 03 · Clean it, chart it", cells: [
    ["md", "# Lesson 03 · Clean it, chart it\nReal data is messy. Find what's missing, fix the types, then chart drops per week. Always put the date range in the title."],
    ["code", "import pandas as pd\nimport matplotlib.pyplot as plt\nreleases = pd.read_csv('releases.csv')\nreleases.isna().sum()"],
    ["code", "releases['release_date'] = pd.to_datetime(releases['release_date'])\nreleases.dtypes"],
    ["code", "start, end = releases['release_date'].min().date(), releases['release_date'].max().date()\nweekly = releases.groupby(releases['release_date'].dt.strftime('%Y-W%W')).size()\nweekly.plot.bar(title=f'Drops per week, {start} to {end}')\nplt.ylabel('releases'); plt.tight_layout(); plt.show()"],
    ["code", "sales = pd.read_csv('sales.csv')\nprint('mean', round(sales['price_usd'].mean()), 'median', sales['price_usd'].median())\nsales['price_usd'].plot.hist(bins=range(0, 450, 50), title='Practice sales log, 2026-08-01 to 2026-10-31')\nplt.xlabel('sale price (USD)'); plt.show()"],
    ["md", "**Your turn:** which brand has the most drops with no price listed yet?"]
  ] },
  { file: "04_regression.ipynb", title: "Lesson 04 · Line of best fit with scikit-learn", cells: [
    ["md", "# Lesson 04 · Line of best fit\nSame model as Day 23 and Day 24, now with scikit-learn. Compare the slope with what you got in SQL and in the browser lab."],
    ["code", "import pandas as pd\nfrom sklearn.linear_model import LinearRegression\nshoes = pd.read_csv('shoes.csv'); sales = pd.read_csv('sales.csv')\ndf = sales.merge(shoes, on='shoe_id')\np = df.groupby(['shoe_id', 'hype', 'retail_usd'])['price_usd'].mean().reset_index()\np['premium_pct'] = 100 * (p['price_usd'] - p['retail_usd']) / p['retail_usd']\nm = LinearRegression().fit(p[['hype']], p['premium_pct'])\nprint('slope', round(m.coef_[0], 1), 'intercept', round(m.intercept_, 1))"],
    ["code", "import matplotlib.pyplot as plt\nplt.scatter(p['hype'], p['premium_pct'])\nxs = pd.DataFrame({'hype': range(1, 11)})\nplt.plot(xs['hype'], m.predict(xs))\nplt.xlabel('hype (1-10)'); plt.ylabel('premium %'); plt.title('Practice data, Aug-Oct 2026'); plt.show()"]
  ] },
  { file: "05_heat_detector_tree.ipynb", title: "Lesson 05 · Heat detector (decision tree)", cells: [
    ["md", "# Lesson 05 · Heat detector\nPredict whether a sale goes for 20%+ over retail. Train on 80%, test on 20%. Same features as the browser lab."],
    ["code", "import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier, export_text\nshoes = pd.read_csv('shoes.csv'); sales = pd.read_csv('sales.csv')\ndf = sales.merge(shoes, on='shoe_id', suffixes=('', '_shoe'))\ndf['weeks_out'] = (pd.to_datetime(df['sale_date']) - pd.to_datetime(df['release_date'])).dt.days / 7\ndf['used'] = (df['condition'] == 'used').astype(int)\ndf['heat'] = (df['price_usd'] >= 1.2 * df['retail_usd']).astype(int)\nX = df[['hype', 'pairs_made', 'retail_usd', 'size_us', 'weeks_out', 'used']]\ny = df['heat']\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=7)"],
    ["code", "for depth in range(1, 9):\n    t = DecisionTreeClassifier(max_depth=depth, random_state=7).fit(X_train, y_train)\n    print(depth, 'train', round(t.score(X_train, y_train), 3), 'test', round(t.score(X_test, y_test), 3))"],
    ["code", "best = DecisionTreeClassifier(max_depth=3, random_state=7).fit(X_train, y_train)\nprint(export_text(best, feature_names=list(X.columns)))"]
  ] },
  { file: "06_customer_groups_kmeans.ipynb", title: "Lesson 06 · Customer groups (k-means)", cells: [
    ["md", "# Lesson 06 · Customer groups\nFind groups of sales by shoe size and price ÷ retail. Scale first so both count equally."],
    ["code", "import pandas as pd\nimport matplotlib.pyplot as plt\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.cluster import KMeans\nshoes = pd.read_csv('shoes.csv'); sales = pd.read_csv('sales.csv')\ndf = sales.merge(shoes, on='shoe_id')\ndf['price_ratio'] = df['price_usd'] / df['retail_usd']\nZ = StandardScaler().fit_transform(df[['size_us', 'price_ratio']])\nkm = KMeans(n_clusters=3, n_init=10, random_state=7).fit(Z)\ndf['group'] = km.labels_\ndf.groupby('group')[['size_us', 'price_ratio']].mean().round(2)"],
    ["code", "plt.scatter(df['size_us'], df['price_ratio'], c=df['group'], s=8)\nplt.xlabel('size (US)'); plt.ylabel('price / retail'); plt.title('Practice sales, Aug-Oct 2026'); plt.show()"]
  ] }
];

/* Starter blog posts (also seeded into the page's database; the weekly task adds Drop Reports). */
const BLOG_SEED = [
  { slug: "drop-report-2026-11-05", title: "Drop Report: Nov 5–11, 2026, by the numbers", date: "2026-11-05", author: "Grail Room data desk", tag: "Drop Report",
    period_start: "2026-11-05", period_end: "2026-11-11",
    summary: "39 releases in seven days, 23 of them on Thursday alone, and a Space Jam takeover.",
    body: "**Period:** Thursday, Nov 5 – Wednesday, Nov 11, 2026. **Source:** Sneaker Files release calendar, checked Nov 5, 2026. Dates can change.\n\n## The headline\n39 releases are listed for these seven days. Thursday, Nov 5 alone has 23, so if you work the counter that day, eat breakfast.\n\n## By brand\n- Nike: 22\n- Jordan: 16\n- adidas: 1\n\n## Prices\nThe average listed retail price is about $183 (one release has no price yet). The three priciest: Nike Air Max Foamdome \"Eggplant\" at $265, and the Nike Air Foamposite Pro \"FSU\" and \"Ohio State\" at $250 each.\n\n## The theme\nA dozen-plus of this week's releases are Space Jam themed, from the Air Jordan 1 Low \"Lola Bunny\" to the Air Jordan 11 \"Magic Ball\" on Nov 11.\n\n## Try it yourself\nOpen the playground and run:\n\n`SELECT brand, COUNT(*) FROM releases WHERE release_date BETWEEN '2026-11-05' AND '2026-11-11' GROUP BY brand;`" },
  { slug: "why-we-dont-scrape-stockx", title: "Why we don't scrape StockX (and what we do instead)", date: "2026-11-05", author: "Theo, data lead", tag: "Data ethics",
    summary: "Where our release data comes from, why some sites are off-limits, and why we link to photos instead of copying them.",
    body: "Every number on this site says where it came from and when. Here's why.\n\n## Some sites say no robots\nResale marketplaces like StockX, GOAT and Flight Club don't allow automated scraping in their terms. So we don't. Our release list comes from a public release calendar, read once a day by a scheduled helper that records exactly when it checked.\n\n## Photos belong to someone\nThose great shoe photos on Hypebeast and Sneaker News are copyrighted. Copying them onto our page without permission isn't okay, so our banner links to the article instead, and shows photos only when we have the right to use them.\n\n## Practice data is labeled\nReal resale prices change by the minute and aren't ours to collect. Our sales log is made-up practice data, and it says so everywhere.\n\n## The checklist\n1. Who collected it, and how?\n2. Which dates does it cover?\n3. What's missing?\n4. Real or practice?\n5. Were we allowed to collect it?" },
  { slug: "welcome-to-the-data-desk", title: "Welcome to the Grail Room data desk", date: "2026-11-05", author: "Rae, store manager", tag: "Store news",
    summary: "How a sneaker shop uses SQL, Python, analytics and AI, and how you'll learn all of it one shift at a time.",
    body: "New here? Good. You'll learn this job one shift at a time.\n\n## How the shop runs on data\n- **SQL** answers counter questions: what drops Saturday, what's under $150.\n- **Python** cleans data and automates our weekly reports.\n- **Analytics** turns numbers into decisions: staffing for big weeks, shelf space by brand.\n- **Machine learning** predicts: will this consigned pair sell for heat or brick?\n- **AI** helps draft queries. We always check its work.\n\n## Your first week\nYou start in the stockroom with zero code. By week five you'll train models in the AI lab. Every day gets a bit harder, and every day ends with something you can do that you couldn't before." }
];

const DATA_ABOUT = [
  { table: "releases", kind: "REAL", what: "Upcoming sneaker releases: date, brand, name, colorway, style code, store price.", source: "Public release calendar, refreshed daily" },
  { table: "shoes", kind: "PRACTICE", what: "20 made-up shoes from 4 made-up brands, with a hype score 1–10.", period: "released 2026-03-07 to 2026-09-26", source: "Generated for practice" },
  { table: "sales", kind: "PRACTICE", what: "The Grail Room's consignment sales log: date, size, price, condition.", period: "2026-08-01 to 2026-10-31", source: "Generated for practice (fixed seed)" }
];

/* Playable characters (original, drawn in the page's sticker style). The story uses the chosen name and pronouns. */
const CHARS = [
  { id: "mike", name: "Big Face", short: "Big Face", she: false, skin: "#8A5A3B", top: "cap", topC: "#17181A", hood: "#F2541B", bg: "#FFD23D", vibe: "Saving for a Halo Comet Mid. Talks fast, learns faster." }
];
/* Shop staff, drawn in the same sticker style */
const STAFF = {
  Rae: { skin: "#C68B59", top: "beanie", topC: "#17181A", hood: "#1F2A52", bg: "#7FD8D8", role: "store manager" },
  Theo: { skin: "#E0B48A", top: "bucket", topC: "#2E8B57", hood: "#2E8B57", bg: "#F4A6C4", role: "data lead" }
};
/* Why each week matters in YOUR life */
const WEEK_YOU = {
  1: "Every app you use is tables with rows and columns: your playlists, your game inventory, your camera roll. SQL is how you ask them questions.",
  2: "Saving up, planning a party, counting a streak: totals, averages and dates are math you already do in your head. Now you make a computer do it in one line.",
  3: "Your bank app joins purchases to store names. Your game joins players to scores. Joins are how separate lists turn into answers.",
  4: "Python is one of the most popular languages for beginners and for data jobs. Scientists, game studios and streaming apps use it every day.",
  5: "Your feed, face unlock, spam filters: that's machine learning. Today you train one yourself and see exactly how it decides."
};
