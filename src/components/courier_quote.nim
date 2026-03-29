## Random courier flavor text — baked-in quotes, no server needed.
## Shows a new quote on each page load or refresh.

{.push warning[UnusedImport]: off.}
import
  std/dom,
  nimponents
{.pop.}

type CourierQuote* = ref object of WebComponent

proc connectedCallback(self: CourierQuote) =
  {.emit: """
  var quotes = [
    // Motivational courier wisdom
    "Every package delivered is a promise kept in the void.",
    "The frontier doesn't deliver itself. Well, not yet.",
    "Through asteroid fields and gate camps, your package will arrive.",
    "Neither rain, nor sleet, nor solar flares shall stay this courier.",
    "Delivering goods at the speed of blockchain.",
    "In space, no one can hear you deliver.",
    "Have package, will travel. Terms negotiable. Mostly.",
    "I didn't choose the courier life. I clicked 'Accept Delivery'.",
    "Fuel is temporary. Reputation is forever.",
    "Another day, another delivery. Another day closer to retirement.",
    "They said 'last mile delivery' would be easy. They lied. It was 47 AU.",
    "My other ship is also full of your stuff.",
    "Courier tip: if the cargo bay is glowing, drive faster.",
    "Trust the process. And by process, I mean the smart contract.",
    "Some call it logistics. I call it an adventure with a deadline.",
    "Package secured. Dignity... less so.",
    "The void doesn't care about your tracking number. But I do.",
    "Hauling cargo so you don't have to. You're welcome.",
    "Fragile? In space? Good luck with that.",
    "I've seen things you people wouldn't believe. Mostly lost packages.",
    "Express delivery: because your ore emergency is my ore emergency.",
    "Born to explore. Forced to deliver.",
    "Keep calm and check your delivery status.",
    "The real treasure was the deliveries we made along the way.",
    "Warning: courier may contain trace amounts of existential dread.",
    "Capsuleer by birth. Courier by questionable life choices.",
    "This delivery is sponsored by caffeine and poor decisions.",
    "If lost, please return courier to nearest Smart Storage Unit.",
    "I brake for asteroids. I accelerate for pirates.",
    "Your delivery ETA is 'soon'. Space-soon. Don't ask.",
    "Interstellar shipping: where 'handle with care' is more of a suggestion.",
    "Do you know how hard it is to find parking at a Smart Storage Unit?",
  ];

  // Easter eggs — special quotes on specific conditions.
  var now = new Date();
  var day = now.getDay();
  var hour = now.getHours();
  var month = now.getMonth();
  var date = now.getDate();

  var quote;

  // Friday
  if (day === 5) {
    var fridayQuotes = [
      "It's Friday. Even couriers dream of docking for the weekend.",
      "TGIF: Thank God It's Fulfillment day.",
      "Friday deliveries hit different. Mostly because I'm half asleep."
    ];
    quote = fridayQuotes[Math.floor(Math.random() * fridayQuotes.length)];
  }
  // Monday
  else if (day === 1) {
    var mondayQuotes = [
      "Monday. The cargo bay is full and my will to live is on backorder.",
      "New week, new deliveries, same existential void."
    ];
    quote = mondayQuotes[Math.floor(Math.random() * mondayQuotes.length)];
  }
  // Late night (midnight to 4am)
  else if (hour >= 0 && hour < 4) {
    var lateQuotes = [
      "Delivering at this hour? Respect. Or insomnia. Probably insomnia.",
      "The graveyard shift: where the deliveries are quiet and the void stares back.",
      "Who needs sleep when there are packages to deliver?"
    ];
    quote = lateQuotes[Math.floor(Math.random() * lateQuotes.length)];
  }
  // April 1st
  else if (month === 3 && date === 1) {
    quote = "All deliveries today will be delivered to the wrong address. Happy April Fools!";
  }
  // Dec 25
  else if (month === 11 && date === 25) {
    quote = "Ho ho ho. Your gift has been delivered. Merry Spacemas, capsuleer.";
  }
  // Halloween
  else if (month === 9 && date === 31) {
    quote = "Spooky delivery incoming. Contents: unknown. Cursed: probably.";
  }
  else {
    quote = quotes[Math.floor(Math.random() * quotes.length)];
  }

  `self`.innerHTML = '<div class="courier-quote"><p>' + quote + '</p></div>';
  """.}

setupNimponent[CourierQuote]("courier-quote", nil, connectedCallback)
