/* Big Face's money: 100 things that can happen between shifts.
   kind: "good" | "bad" | "choice"
   eff keys (all optional):
     cash: +/- dollars          pct: share of current cash (+0.1 = +10%)
     brand: [brand, multiplier] market price change for one practice brand
     all: multiplier            market price change for every shoe
     hit: multiplier            one random pair in Big Face's closet changes value (needs a closet)
     lose: 1                    one random pair is gone (needs a closet)
     sell: share of market      one random closet pair sells right now at that share of its price (needs a closet)
     gift: 1                    a free pair lands in the closet
   choices: [label, eff, outcome text]; an eff with p uses {p, win, lose}.
   Brands are the made-up practice brands: Northbound, Halo Athletic, Kitebird, Mavrik. */
const WALLET = { start: 60, grailId: 10, fee: 0.1, wageRate: 0.5, firstTryTip: 10 };

const EVENTS = [
  /* ---------- 35 bad breaks ---------- */
  ["bad", "Cracked phone screen", "Big Face's phone slips out of his pocket at the bus stop. The repair shop charges $40.", { cash: -40 }],
  ["bad", "Hole in the pocket", "A hole in his jacket pocket. Some of the cash he was carrying is gone.", { pct: -0.15 }],
  ["bad", "Label misprint", "The shipping label printed blurry and the courier rejected it. New label: $12.", { cash: -12 }],
  ["bad", "Late fee", "Big Face forgot a library book for three weeks. Late fee: $8.", { cash: -8 }],
  ["bad", "Creased on try-on", "He tried on a pair from his closet 'just for a second'. Toe-box crease. Buyers pay less for worn pairs.", { hit: 0.75 }],
  ["bad", "Crushed box", "A pair's box got crushed in the closet. Collectors pay more for a clean box, so this one is worth less.", { hit: 0.85 }],
  ["bad", "Lost in the mail", "The courier lost a pair he sent for authentication. No tracking update for weeks.", { lose: 1 }],
  ["bad", "Knock-off laces", "Big Face bought 'premium' rope laces online. They fell apart in a day. $15 wasted.", { cash: -15 }],
  ["bad", "Caught in the rain", "Surprise downpour on the walk home. Suede and water don't mix.", { hit: 0.7 }],
  ["bad", "Kitebird restock", "Kitebird announces a big restock. More pairs means lower prices for everyone holding them.", { brand: ["Kitebird", 0.8] }],
  ["bad", "Halo glue issue", "Reports say some Halo Athletic soles are separating. Buyers get nervous.", { brand: ["Halo Athletic", 0.75] }],
  ["bad", "Post-holiday chill", "Everyone spent their money last month. The whole market cools off.", { all: 0.9 }],
  ["bad", "Mavrik remake", "Mavrik announces it will remake its classics next year. Today's pairs feel less special.", { brand: ["Mavrik", 0.85] }],
  ["bad", "Outlet flood", "Northbound pairs show up at outlet stores at 40% off.", { brand: ["Northbound", 0.8] }],
  ["bad", "Forgotten free trial", "A 'free trial' turned into a $10 monthly charge. Always set a reminder to cancel.", { cash: -10 }],
  ["bad", "Borrowed and scuffed", "His cousin borrowed a pair for a party. It came back scuffed.", { hit: 0.8 }],
  ["bad", "Return shipping", "He ordered the wrong size of a hoodie. Return shipping: $11.", { cash: -11 }],
  ["bad", "Chargeback scam", "A buyer said a pair 'never arrived' even though tracking said delivered. The app sided with the buyer this time.", { cash: -45 }],
  ["bad", "Flat tire", "Bike tire popped. Bus fare to work all week: $5.", { cash: -5 }],
  ["bad", "Sales tax surprise", "A $100 cleaning kit order came to $107. Sales tax is 7% here: $7 more than the sticker price.", { cash: -7 }],
  ["bad", "The dog got bored", "The family dog chewed the corner of a shoebox.", { hit: 0.9 }],
  ["bad", "Express by mistake", "He clicked express shipping instead of standard. That cost $14 extra.", { cash: -14 }],
  ["bad", "'Kitebird is over'", "A big sneaker account posts that Kitebird is 'so over'. Prices follow the mood.", { brand: ["Kitebird", 0.7] }],
  ["bad", "Yellowing soles", "An older pair's icy soles are turning yellow. That happens with age and sunlight.", { hit: 0.85 }],
  ["bad", "School trip", "The class trip to the science museum costs $25. Worth it, but it comes out of the wallet.", { cash: -25 }],
  ["bad", "Instant transfer fees", "Big Face kept paying 'instant transfer' fees instead of waiting a day. They added up to about 5%.", { pct: -0.05 }],
  ["bad", "Raffle losses", "He entered three raffles at $5 each and lost all three. $15 gone.", { cash: -15 }],
  ["bad", "Panic rumor", "A fake rumor says the resale apps are shutting down. Everyone sells at once.", { all: 0.85 }],
  ["bad", "Snack math", "$2 snacks, six days in a row. $12 gone before he noticed. Small spends add up.", { cash: -12 }],
  ["bad", "Out of cleaner", "Cleaning kit ran out right before a sale. A new one costs $13.", { cash: -13 }],
  ["bad", "Skate day", "He wore a pair skateboarding. Heel drag is real.", { hit: 0.8 }],
  ["bad", "Halo leaks", "Leaked photos show Halo Athletic's next shoe looks way better than the current one.", { brand: ["Halo Athletic", 0.85] }],
  ["bad", "Too many listings", "Hundreds of Mavrik pairs get listed the same weekend. Sellers undercut each other.", { brand: ["Mavrik", 0.8] }],
  ["bad", "Overdue phone bill", "Big Face promised to pay his share of the phone bill. $20 due.", { cash: -20 }],
  ["bad", "Water bottle leak", "His water bottle leaked in his backpack, right onto a pair he was taking to a buyer.", { hit: 0.85 }],

  /* ---------- 30 lucky breaks ---------- */
  ["good", "Grandma's card", "A birthday card from Grandma with $25 inside.", { cash: 25 }],
  ["good", "Old jacket money", "He finds $20 in a jacket he hasn't worn since last winter.", { cash: 20 }],
  ["good", "Holiday bonus", "Rae gives every worker a $30 holiday bonus.", { cash: 30 }],
  ["good", "Great service", "A customer tips $10 because Big Face found the exact size in seconds with a query.", { cash: 10 }],
  ["good", "Kitebird collab", "Kitebird announces a collab with a famous skate brand. Old Kitebirds suddenly matter.", { brand: ["Kitebird", 1.3] }],
  ["good", "Streamer drip", "A huge streamer wears Mavrik on stream for six hours. Chat goes wild.", { brand: ["Mavrik", 1.4] }],
  ["good", "Discontinued", "Halo Athletic stops making the Orbit line. Fewer pairs from now on.", { brand: ["Halo Athletic", 1.25] }],
  ["good", "Northbound anniversary", "Northbound turns 50 and everyone wants the classics.", { brand: ["Northbound", 1.2] }],
  ["good", "Sneaker season", "Back-to-school season. Demand climbs everywhere.", { all: 1.1 }],
  ["good", "Garage find", "He sells an old video game he never plays for $18.", { cash: 18 }],
  ["good", "Sneaker cleaning hustle", "A neighbor pays $15 to have his sneakers cleaned.", { cash: 15 }],
  ["good", "Trivia champ", "Big Face wins the store's data trivia night. Prize: $20.", { cash: 20 }],
  ["good", "Savings match", "Mom matches 10% of whatever Big Face has saved.", { pct: 0.1 }],
  ["good", "Interest paid", "His savings account pays 2% interest. Small, but it's free money for doing nothing.", { pct: 0.02 }],
  ["good", "Raffle win!", "He finally wins a raffle. A free pair arrives.", { gift: 1 }],
  ["good", "Lawn season", "Two lawns mowed this weekend: $30.", { cash: 30 }],
  ["good", "Refund arrived", "The refund for that wrong-size order finally landed: $11.", { cash: 11 }],
  ["good", "Found the box", "He finds the original box and extra laces for one of his pairs. Complete sets sell for more.", { hit: 1.15 }],
  ["good", "Movie moment", "Northbound shows up in a hit movie's final scene.", { brand: ["Northbound", 1.3] }],
  ["good", "Limited run", "Kitebird confirms only 2,000 pairs of the next Flutter. Collectors start buying older ones.", { brand: ["Kitebird", 1.2] }],
  ["good", "Debt repaid", "His friend pays back the $15 he borrowed in September.", { cash: 15 }],
  ["good", "Coupon code", "A coupon code saves $5 on supplies.", { cash: 5 }],
  ["good", "Viral closet", "A photo of one of his pairs goes viral. People DM asking to buy it.", { hit: 1.3 }],
  ["good", "Uncle's garage sale", "He helps his uncle run a garage sale: $22.", { cash: 22 }],
  ["good", "Restock cancelled", "Halo Athletic cancels a planned restock.", { brand: ["Halo Athletic", 1.15] }],
  ["good", "Holiday rush", "Gift season. Everyone wants sneakers.", { all: 1.12 }],
  ["good", "Recycling prize", "His class wins the recycling drive. Everyone gets $10.", { cash: 10 }],
  ["good", "Staff discount", "His staff discount saves $8 on a cleaning kit he needed anyway.", { cash: 8 }],
  ["good", "Last pair ever", "Mavrik says the Legacy 85 will never be made again.", { brand: ["Mavrik", 1.25] }],
  ["good", "Neighbor's dog walking", "Walking the neighbor's dog all week: $16.", { cash: 16 }],

  /* ---------- 35 choices ---------- */
  ["choice", "Mystery box", "A seller offers a $30 mystery box. 'Could be worth $80!' Most mystery boxes are worth less than they cost.", null, [
    ["Buy it ($30)", { p: 0.35, win: { cash: 50 }, lose: { cash: -20 } }, "You opened it…"],
    ["Pass", {}, "You kept your $30. Smart: the seller set the price knowing what's inside."]]],
  ["choice", "Double your money?", "A stranger DMs: 'Send $20, I'll send back $40 in an hour. Guaranteed.'", null, [
    ["Send $20", { cash: -20 }, "The account vanished. Anyone promising 'guaranteed' money back is running a scam."],
    ["Block and report", { cash: 0 }, "Blocked. Rule: if it sounds too good to be true, it is."]]],
  ["choice", "Ship with insurance?", "Big Face's mailing a sold pair. Insurance costs $4. Without it, if the package is lost, he has to refund the buyer $60.", null, [
    ["Pay $4 for insurance", { cash: -4 }, "Package arrived. $4 for peace of mind: that's what insurance is."],
    ["Skip it", { p: 0.8, win: {}, lose: { cash: -60 } }, "You crossed your fingers…"]]],
  ["choice", "Friend needs $20", "His friend asks to borrow $20 and promises to pay back $25 next week.", null, [
    ["Lend it", { p: 0.7, win: { cash: 5 }, lose: { cash: -20 } }, "Next week…"],
    ["Say no, kindly", {}, "No money lost. Only lend what you could live without getting back."]]],
  ["choice", "Raffle ticket", "A $10 raffle for a rare pair. About 1 in 7 entries win.", null, [
    ["Enter ($10)", { p: 0.15, win: { cash: -10, gift: 1 }, lose: { cash: -10 } }, "The draw…"],
    ["Skip", {}, "You kept $10. Expected value: a 15% chance is usually not worth $10."]]],
  ["choice", "Pro cleaning", "A pro cleaner offers to restore one of your pairs for $15. Clean pairs sell for about 20% more.", null, [
    ["Pay $15", { cash: -15, hit: 1.2 }, "Looks brand new. If the pair is worth more than $75, a 20% boost beats the $15 cost."],
    ["Clean it yourself", {}, "Saved the money. It looks okay."]], true],
  ["choice", "Lace flip", "A bulk pack of 20 lace sets costs $20. He could sell them at school for $2 each.", null, [
    ["Buy the pack", { p: 0.7, win: { cash: 15 }, lose: { cash: -10 } }, "At school…"],
    ["Not worth the hassle", {}, "No risk, no reward."]]],
  ["choice", "Meetup snack stand", "Sell snacks at the weekend sneaker meetup. Supplies cost $10.", null, [
    ["Set up the stand", { p: 0.65, win: { cash: 25 }, lose: { cash: -10 } }, "Saturday…"],
    ["Just go to shop", {}, "You enjoyed the meetup."]]],
  ["choice", "Online 'resell course'", "An ad: 'Learn sneaker investing! Only $25!'", null, [
    ["Buy the course", { cash: -25 }, "It was 12 slides of stuff you already learned here. Free learning first."],
    ["Close the ad", {}, "You're already learning the real skill: reading the data."]]],
  ["choice", "Design contest", "A $5 entry fee for a sneaker design contest. Top 3 win $60.", null, [
    ["Enter ($5)", { p: 0.2, win: { cash: 55 }, lose: { cash: -5 } }, "Results are in…"],
    ["Skip", {}, "Maybe next time."]]],
  ["choice", "Quick cash offer", "A buyer offers to take one of your pairs right now at 90% of market price. No fees, no waiting.", null, [
    ["Take it", { sell: 0.9 }, "Sold. 90% with no fee is the same as selling at full price with a 10% fee."],
    ["Hold", {}, "You held. Prices might go up… or down."]], true],
  ["choice", "Lowball", "A buyer offers 70% of market for one of your pairs. 'Final offer, bro.'", null, [
    ["Accept", { sell: 0.7 }, "Sold, but you left 30% on the table."],
    ["Decline", {}, "Declined. Knowing the market price protects you from lowballs."]], true],
  ["choice", "Beater pair", "A thrift store has a beat-up pair for $15. With cleaning, it might resell for $40.", null, [
    ["Buy and clean it", { p: 0.6, win: { cash: 25 }, lose: { cash: -15 } }, "After the cleaning…"],
    ["Leave it", {}, "Passed."]]],
  ["choice", "Concert tickets", "Friends are going to a concert. Tickets are $35.", null, [
    ["Go!", { cash: -35 }, "Great night. Spending on experiences is fine when you plan for it."],
    ["Stay home and save", {}, "Saved $35. Your grail jar thanks you."]]],
  ["choice", "Authentication fee", "A buyer wants proof one of your pairs is real. Authentication costs $12, and an authenticated pair sells for about 10% more.", null, [
    ["Pay $12", { cash: -12, hit: 1.1 }, "Authenticated. That 10% boost pays off on any pair worth over $120."],
    ["Skip it", {}, "No proof, no boost."]], true],
  ["choice", "Split a pizza", "Team pizza after a long shift. Split 4 ways, it's $6 each.", null, [
    ["Chip in $6", { cash: -6 }, "Team bonding. $24 ÷ 4 = $6."],
    ["Bring a sandwich", {}, "Saved $6."]]],
  ["choice", "Hold or sell Kitebird?", "Kitebird rumors are flying. Some say a big collab is coming, others say a restock.", null, [
    ["Bet on the collab", { p: 0.5, win: { brand: ["Kitebird", 1.3] }, lose: { brand: ["Kitebird", 0.8] } }, "The news drops…"],
    ["Stay out of it", {}, "Rumors are just rumors until there's data."]]],
  ["choice", "Garage sale bundle", "Three random pairs at a garage sale for $25 total.", null, [
    ["Buy the bundle", { p: 0.5, win: { cash: 35 }, lose: { cash: -15 } }, "You check the sizes and condition…"],
    ["Pass", {}, "Passed."]]],
  ["choice", "Weekend overtime", "Rae asks if Big Face can work an extra Saturday shift. It pays $30 but he'd miss the beach trip.", null, [
    ["Work it", { cash: 30 }, "+$30. Time is money, but so is rest."],
    ["Go to the beach", {}, "Great day. Balance matters."]]],
  ["choice", "Fake check", "A buyer 'accidentally' sends $200 for a $100 pair and asks Big Face to send back $100.", null, [
    ["Send back $100", { cash: -100 }, "The $200 payment bounced two days later. Classic overpayment scam: never refund 'extra' money."],
    ["Cancel the sale", {}, "Smart. Overpayment is a known scam."]]],
  ["choice", "Bulk cleaner deal", "Cleaner is $13 a bottle, or 3 bottles for $30.", null, [
    ["Buy 3 for $30", { cash: -30 }, "That's $10 a bottle instead of $13: 23% cheaper, if you actually use all three."],
    ["Buy 1 for $13", { cash: -13 }, "Cheaper today, more per bottle."]]],
  ["choice", "Market crash rumor", "The whole market dipped. Panic selling or patience?", null, [
    ["Panic-sell a pair", { sell: 0.75 }, "Sold low. Prices bounced back a few days later."],
    ["Wait it out", { all: 1.08 }, "Patience paid. Prices recovered."]], true],
  ["choice", "Little sister's birthday", "His little sister's birthday is coming. A gift would cost about $15.", null, [
    ["Buy a gift", { cash: -15 }, "She loved it. Some spending isn't about profit."],
    ["Make a card", {}, "She loved the card too."]]],
  ["choice", "Promote your listing", "The resale app offers to 'boost' a listing for $8 so more people see it.", null, [
    ["Boost it", { p: 0.5, win: { cash: 22 }, lose: { cash: -8 } }, "Did more views mean a better price?"],
    ["Don't boost", {}, "It'll sell eventually."]]],
  ["choice", "Spot the fake", "Someone offers a 'Mavrik Legacy 85' for $60. Market price is around $300.", null, [
    ["Buy it", { cash: -60 }, "Fake. The stitching was off and the box label was wrong. A price way below market is a red flag."],
    ["Walk away", {}, "Good eye. An 80% discount means something's wrong."]]],
  ["choice", "Help at the counter", "A kid can't afford the shoes he wants. Big Face could skip his lunch money to cover the last $10.", null, [
    ["Help him", { cash: -10 }, "The kid's face lit up. Rae noticed too."],
    ["Point him to the sale rack", {}, "He found a pair he liked."]]],
  ["choice", "New phone case", "A sturdy phone case costs $18. His phone has already cracked once.", null, [
    ["Buy the case", { cash: -18 }, "Prevention is cheaper than a $40 repair."],
    ["Risk it", { p: 0.7, win: {}, lose: { cash: -40 } }, "A few weeks later…"]]],
  ["choice", "Group buy", "Friends are pooling money to buy a whole box of 10 pairs at a discount. His share: $40.", null, [
    ["Join in", { p: 0.6, win: { cash: 30 }, lose: { cash: -20 } }, "When you split up the pairs…"],
    ["Too risky", {}, "Fine call. Group deals get messy."]]],
  ["choice", "Trade up", "Someone offers to trade one of your pairs plus $10 for a slightly better pair.", null, [
    ["Trade", { cash: -10, hit: 1.2 }, "Better pair in hand. Worth it if the value jump is more than $10."],
    ["Keep yours", {}, "Kept your pair."]], true],
  ["choice", "Save or spend?", "Big Face's mom offers a deal: lock $20 in his savings and she adds $5.", null, [
    ["Lock it in", { cash: 5 }, "Free $5 for waiting. That's a 25% bonus."],
    ["Keep it loose", {}, "Money in hand is tempting to spend."]]],
  ["choice", "Too-good flash sale", "An unknown website has Halo Comet Mids for $50. Normally they're $400+.", null, [
    ["Order", { cash: -50 }, "Nothing arrived. The site disappeared. Check reviews and if the price makes sense."],
    ["Close the tab", {}, "Good instinct."]]],
  ["choice", "Sell a pair at the meetup", "At the meetup, someone offers full market price for one of your pairs, cash, no fees.", null, [
    ["Sell it", { sell: 1.0 }, "Full price and no 10% fee. Meetups can beat the apps."],
    ["Keep it", {}, "You kept it."]], true],
  ["choice", "Video game sale", "A game he's wanted is 50% off: $30 instead of $60.", null, [
    ["Buy it", { cash: -30 }, "Saved $30… by spending $30. A sale only saves money if you'd buy it anyway."],
    ["Not now", {}, "Your grail jar stays full."]]],
  ["choice", "Repair or replace?", "His work shoes are falling apart. A repair costs $12, new ones $45.", null, [
    ["Repair ($12)", { cash: -12 }, "Good as new. Repairing often beats replacing."],
    ["Replace ($45)", { cash: -45 }, "Fresh pair, lighter wallet."]]],
  ["choice", "Hype check", "Mavrik's next drop is trending. Some people are buying older Mavriks expecting a price jump.", null, [
    ["Follow the hype", { p: 0.45, win: { brand: ["Mavrik", 1.25] }, lose: { brand: ["Mavrik", 0.85] } }, "Drop day…"],
    ["Ignore the noise", {}, "Hype is a guess. Data is a fact."]]]
];
