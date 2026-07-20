import type { StarterModel } from "./types";

// Keyword lists are hand-picked to actually fire against the sample document
// text below, so a freshly-created starter project shows real tagged /
// orphaned / untagged documents and a couple of theme hits immediately —
// not just an empty taxonomy. Source values are varied across documents so
// Reports' attribute breakdown has something real to show.

const AIRLINE_SOURCES = ["App Review", "Support Call Transcript", "Post-flight Survey", "Social Media"];

const airline: StarterModel = {
  key: "airline",
  name: "Airline Customer Experience",
  description: "Pre-flight, in-flight, and post-flight topics covering booking, service, and logistics.",
  topics: [
    {
      name: "Pre-flight",
      keywords: ["pre-flight"],
      description: "Everything that happens before boarding: discovering, pricing, booking, and checking in for a flight.",
      children: [
        { name: "Pricing", keywords: ["fare", "fares", "price", "expensive", "cheap", "fee", "fees"], description: "Fare levels, add-on fees, and perceived value for the ticket price." },
        { name: "Discovery", keywords: ["website", "browsing", "found the flight"], description: "How customers found and researched the flight before buying." },
        { name: "Purchase", keywords: ["booked", "booking", "purchase", "checkout"], description: "The booking/checkout flow itself, separate from pricing." },
        { name: "Airport arrival", keywords: ["security line", "arrival area", "dropped off at the airport"], description: "Arriving at the airport and moving through security before the gate." },
        {
          name: "Check-in",
          keywords: ["check-in", "check in"],
          description: "Checking in for a flight, whether online, via app, or in person.",
          children: [
            { name: "Online check-in", keywords: ["checking in online", "checked in online", "app check-in"], description: "Checking in through the airline's website or app." },
            { name: "Kiosk check-in", keywords: ["kiosk"], description: "Self-service kiosk check-in at the airport." },
          ],
        },
      ],
    },
    {
      name: "In-flight",
      keywords: ["in-flight", "in flight"],
      description: "The flight itself, from boarding to landing: cabin conditions, timeliness, and crew.",
      children: [
        { name: "Cleanliness", keywords: ["dirty", "clean", "crumbs", "spotless"], description: "Physical cleanliness of the cabin and seating area." },
        { name: "Timeliness", keywords: ["delayed", "on time", "boarding delay"], description: "Whether the flight departed and arrived on schedule." },
        { name: "Attendants", keywords: ["attendant", "attendants", "crew", "flight attendant"], description: "Interactions with flight attendants and cabin crew." },
      ],
    },
    {
      name: "Post-flight",
      keywords: ["post-flight"],
      description: "Everything after landing: baggage claim and leaving the airport.",
      children: [
        { name: "Baggage", keywords: ["bag", "bags", "luggage", "baggage", "suitcase"], description: "Checked baggage handling, delays, and claim experience." },
        { name: "Airport departure", keywords: ["leaving the airport", "deplaning", "exit"], description: "Deplaning and exiting the arrival airport." },
      ],
    },
  ],
  themes: [
    { name: "Wifi reliability", keywords: ["wifi", "wi-fi", "internet connection"], description: "How consistently in-flight wifi stayed connected and usable." },
    { name: "Long hold times", keywords: ["on hold", "hold for", "wait time"], description: "Extended waits on the phone with customer service." },
    { name: "Seat comfort", keywords: ["legroom", "seat recline", "knees jammed", "cramped"], description: "Physical comfort of the seat itself — legroom, recline, cramped feeling." },
    { name: "Gate change confusion", keywords: ["gate changed", "wrong gate", "gate change"], description: "Poor communication when a departure gate changes last-minute." },
  ],
  attributes: [{ key: "source", label: "Source", type: "select", options: AIRLINE_SOURCES }],
  documents: [
    { docKey: "airline-01", name: "review_01.txt", content: "The attendants were super friendly and checking in online took less than a minute before the flight.", attributes: { source: "App Review" } },
    { docKey: "airline-02", name: "review_02.txt", content: "My luggage showed up a day late and the baggage claim area was a complete mess.", attributes: { source: "Post-flight Survey" } },
    { docKey: "airline-03", name: "review_03.txt", content: "Everything about the in-flight experience felt rushed, and the wifi kept cutting out every twenty minutes.", attributes: { source: "Social Media" } },
    { docKey: "airline-04", name: "review_04.txt", content: "I was on hold for forty minutes before anyone picked up to help with a simple rebooking.", attributes: { source: "Support Call Transcript" } },
    { docKey: "airline-05", name: "review_05.txt", content: "The gate changed twice on the app but the board never updated, so half of us were standing at the wrong gate.", attributes: { source: "Social Media" } },
    { docKey: "airline-06", name: "review_06.txt", content: "Checking in online was fast and easy, no complaints there at all.", attributes: { source: "App Review" } },
    { docKey: "airline-07", name: "review_07.txt", content: "The kiosk at the airport was broken so I had to check in with a human agent, which took forever.", attributes: { source: "Post-flight Survey" } },
    { docKey: "airline-08", name: "review_08.txt", content: "Fares have gotten so expensive lately, and the extra fees keep piling up at checkout.", attributes: { source: "Post-flight Survey" } },
    { docKey: "airline-09", name: "review_09.txt", content: "We found the flight and booked our tickets through the website without any issues.", attributes: { source: "App Review" } },
    { docKey: "airline-10", name: "review_10.txt", content: "The plane was noticeably dirty when we boarded, crumbs were all over the tray table.", attributes: { source: "Post-flight Survey" } },
    { docKey: "airline-11", name: "review_11.txt", content: "Our flight was delayed by two hours with barely any communication from the gate crew.", attributes: { source: "Social Media" } },
    { docKey: "airline-12", name: "review_12.txt", content: "Leaving the airport after landing was quick since baggage claim was right by the exit.", attributes: { source: "Post-flight Survey" } },
    { docKey: "airline-13", name: "review_13.txt", content: "It was a totally unremarkable flight, nothing good or bad really stood out.", attributes: { source: "Post-flight Survey" } },
    { docKey: "airline-14", name: "review_14.txt", content: "My knees were jammed against the seat in front of me for the entire six hour flight, cramped the whole way.", attributes: { source: "Social Media" } },
    { docKey: "airline-15", name: "review_15.txt", content: "The security line in the arrival area moved quickly and the attendant at the desk was helpful.", attributes: { source: "App Review" } },
  ],
};

const HOTEL_SOURCES = ["Guest Survey", "Travel Site Review", "Front Desk Comment Card"];

const hotel: StarterModel = {
  key: "hotel",
  name: "Hotel Guest Experience",
  description: "Booking, stay, and checkout topics covering rooms, amenities, and staff interactions.",
  topics: [
    {
      name: "Booking",
      keywords: ["booking"],
      description: "The reservation process, before the guest arrives.",
      children: [
        { name: "Reservation Process", keywords: ["reservation", "booked online", "booking confirmation"], description: "Making and confirming a reservation." },
        { name: "Rate & Pricing", keywords: ["rate", "nightly rate", "discount", "deal"], description: "Nightly rates, discounts, and perceived value." },
      ],
    },
    {
      name: "Stay",
      keywords: ["our stay", "the stay"],
      description: "The on-property experience during a guest's stay.",
      children: [
        { name: "Room Quality", keywords: ["the room", "our room", "the bed", "the view"], description: "Condition and comfort of the room itself." },
        { name: "Amenities", keywords: ["pool", "gym", "spa", "breakfast buffet"], description: "Shared amenities like the pool, gym, and spa." },
        { name: "Housekeeping", keywords: ["housekeeping", "towels", "room was cleaned"], description: "Daily cleaning and housekeeping service." },
      ],
    },
    {
      name: "Checkout",
      keywords: ["checkout", "check-out"],
      description: "Billing and departure at the end of a stay.",
      children: [
        { name: "Billing", keywords: ["billed", "charged twice", "invoice"], description: "Billing accuracy and invoice handling." },
        { name: "Departure Experience", keywords: ["front desk at checkout", "leaving the hotel"], description: "The checkout process and leaving the property." },
      ],
    },
  ],
  themes: [
    { name: "Staff friendliness", keywords: ["friendly staff", "welcoming", "staff were so helpful"], description: "General warmth and helpfulness of staff, not tied to one department." },
    { name: "Noise complaints", keywords: ["noisy", "thin walls", "could hear everything"], description: "Noise disturbance from neighboring rooms or the property." },
    { name: "Breakfast quality", keywords: ["breakfast was", "the buffet"], description: "Quality and variety of the breakfast offering." },
  ],
  attributes: [{ key: "source", label: "Source", type: "select", options: HOTEL_SOURCES }],
  documents: [
    { docKey: "hotel-01", name: "guest_review_01.txt", content: "Booked online in about two minutes and the reservation confirmation came through instantly.", attributes: { source: "Travel Site Review" } },
    { docKey: "hotel-02", name: "guest_review_02.txt", content: "The room had a beautiful view but the bed was surprisingly uncomfortable for the nightly rate we paid.", attributes: { source: "Guest Survey" } },
    { docKey: "hotel-03", name: "guest_review_03.txt", content: "Housekeeping left fresh towels every day and the room was cleaned spotlessly.", attributes: { source: "Front Desk Comment Card" } },
    { docKey: "hotel-04", name: "guest_review_04.txt", content: "We were charged twice for the same night and it took three calls to get it sorted out.", attributes: { source: "Guest Survey" } },
    { docKey: "hotel-05", name: "guest_review_05.txt", content: "The staff were so helpful the entire stay, especially at the front desk.", attributes: { source: "Travel Site Review" } },
    { docKey: "hotel-06", name: "guest_review_06.txt", content: "Our stay was completely ruined because we could hear everything from the room next door, so thin walls throughout.", attributes: { source: "Guest Survey" } },
    { docKey: "hotel-07", name: "guest_review_07.txt", content: "The breakfast was excellent, the buffet had way more variety than I expected.", attributes: { source: "Front Desk Comment Card" } },
    { docKey: "hotel-08", name: "guest_review_08.txt", content: "Found a great discount rate and the pool and gym were both clean and well maintained.", attributes: { source: "Travel Site Review" } },
    { docKey: "hotel-09", name: "guest_review_09.txt", content: "Leaving the hotel was smooth, the front desk at checkout had our invoice ready in seconds.", attributes: { source: "Front Desk Comment Card" } },
    { docKey: "hotel-10", name: "guest_review_10.txt", content: "Nothing particularly memorable about the trip, it was fine.", attributes: { source: "Guest Survey" } },
    { docKey: "hotel-11", name: "guest_review_11.txt", content: "The spa was a nice surprise, we hadn't planned on using it but ended up loving it.", attributes: { source: "Travel Site Review" } },
    { docKey: "hotel-12", name: "guest_review_12.txt", content: "Our room was never properly cleaned the whole stay, housekeeping seemed to skip us twice.", attributes: { source: "Guest Survey" } },
  ],
};

const SUPPORT_SOURCES = ["Email Ticket", "Live Chat Transcript", "In-App Feedback"];

const support: StarterModel = {
  key: "support",
  name: "Support Ticket Triage",
  description: "Issue categories and resolution patterns for inbound customer support tickets.",
  topics: [
    {
      name: "Account",
      keywords: ["account"],
      description: "Anything tied to a customer's account itself, as opposed to the product.",
      children: [
        { name: "Login Issues", keywords: ["can't log in", "login", "password reset"], description: "Trouble logging in or resetting a password." },
        { name: "Billing Disputes", keywords: ["billing", "charged twice", "refund"], description: "Disputed charges and refund requests." },
        { name: "Subscription Changes", keywords: ["cancel my subscription", "downgrade", "upgrade my plan"], description: "Upgrading, downgrading, or cancelling a subscription." },
      ],
    },
    {
      name: "Product",
      keywords: ["the product"],
      description: "Issues with the product's functionality itself.",
      children: [
        { name: "Bug Reports", keywords: ["bug", "crashes", "error message"], description: "Reported defects, crashes, and error messages." },
        { name: "Feature Requests", keywords: ["feature request", "would be great if", "wish it had"], description: "Requests for functionality that doesn't exist yet." },
        { name: "Performance", keywords: ["slow", "lag", "loading forever"], description: "Slowness and responsiveness complaints." },
      ],
    },
    {
      name: "Onboarding",
      keywords: ["onboarding", "getting started"],
      description: "The first-run experience for new customers.",
      children: [
        { name: "Setup Help", keywords: ["setup", "set up", "initial configuration"], description: "Help getting initial configuration working." },
        { name: "Documentation Gaps", keywords: ["documentation", "the docs", "couldn't find any docs"], description: "Missing or unclear documentation." },
      ],
    },
    {
      name: "Support Experience",
      keywords: ["support team", "your support"],
      description: "Quality of the support interaction itself, separate from the underlying issue.",
      children: [
        { name: "Response Time", keywords: ["response time", "took days to reply", "slow to respond"], description: "How quickly support responded." },
        { name: "Agent Quality", keywords: ["support agent", "the rep", "unhelpful agent"], description: "Helpfulness and competence of the support agent." },
      ],
    },
  ],
  themes: [
    { name: "Frustration signals", keywords: ["frustrated", "ridiculous", "unacceptable"], description: "Language indicating the customer is frustrated or escalating." },
    { name: "Positive resolution", keywords: ["resolved quickly", "fixed right away", "great support"], description: "Signals that an issue was resolved well." },
  ],
  attributes: [{ key: "source", label: "Source", type: "select", options: SUPPORT_SOURCES }],
  documents: [
    { docKey: "ticket-01", name: "ticket_01.txt", content: "I can't log in no matter how many times I reset my password, this is getting ridiculous.", attributes: { source: "Email Ticket" } },
    { docKey: "ticket-02", name: "ticket_02.txt", content: "Billing charged me twice this month and I need a refund processed as soon as possible.", attributes: { source: "Email Ticket" } },
    { docKey: "ticket-03", name: "ticket_03.txt", content: "Found a bug where the app crashes every time I try to export a report.", attributes: { source: "In-App Feedback" } },
    { docKey: "ticket-04", name: "ticket_04.txt", content: "Would be great if there was a dark mode, it's a small feature request but it would help a lot.", attributes: { source: "In-App Feedback" } },
    { docKey: "ticket-05", name: "ticket_05.txt", content: "The dashboard has been so slow lately, loading forever every time I switch tabs.", attributes: { source: "Live Chat Transcript" } },
    { docKey: "ticket-06", name: "ticket_06.txt", content: "During onboarding I couldn't find any docs explaining how to configure the initial setup.", attributes: { source: "Email Ticket" } },
    { docKey: "ticket-07", name: "ticket_07.txt", content: "Response time from your support team has been terrible, it took days to reply to a simple question.", attributes: { source: "Email Ticket" } },
    { docKey: "ticket-08", name: "ticket_08.txt", content: "The rep I spoke with was fantastic and resolved quickly, really great support overall.", attributes: { source: "Live Chat Transcript" } },
    { docKey: "ticket-09", name: "ticket_09.txt", content: "I want to cancel my subscription but can't find where to do it in account settings.", attributes: { source: "In-App Feedback" } },
    { docKey: "ticket-10", name: "ticket_10.txt", content: "Everything has been working fine, just checking in to confirm my plan details.", attributes: { source: "Live Chat Transcript" } },
    { docKey: "ticket-11", name: "ticket_11.txt", content: "This is unacceptable, I've been frustrated with the constant crashes for weeks now.", attributes: { source: "Email Ticket" } },
    { docKey: "ticket-12", name: "ticket_12.txt", content: "Support agent was unhelpful and seemed to not understand the actual issue I was describing.", attributes: { source: "Live Chat Transcript" } },
  ],
};

export const STARTER_MODELS: StarterModel[] = [airline, hotel, support];

export function getStarterModel(key: string): StarterModel | undefined {
  return STARTER_MODELS.find((m) => m.key === key);
}
