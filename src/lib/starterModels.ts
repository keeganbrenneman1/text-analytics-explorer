import type { StarterModel } from "./types";

// Keyword lists are hand-picked to actually fire against the sample document
// text below, so a freshly-created starter project shows real tagged /
// orphaned / untagged documents and a couple of theme hits immediately —
// not just an empty taxonomy.

const airline: StarterModel = {
  key: "airline",
  name: "Airline Customer Experience",
  description: "Pre-flight, in-flight, and post-flight topics covering booking, service, and logistics.",
  topics: [
    {
      name: "Pre-flight",
      keywords: ["pre-flight"],
      children: [
        { name: "Pricing", keywords: ["fare", "fares", "price", "expensive", "cheap", "fee", "fees"] },
        { name: "Discovery", keywords: ["website", "browsing", "found the flight"] },
        { name: "Purchase", keywords: ["booked", "booking", "purchase", "checkout"] },
        { name: "Airport arrival", keywords: ["security line", "arrival area", "dropped off at the airport"] },
        {
          name: "Check-in",
          keywords: ["check-in", "check in"],
          children: [
            { name: "Online check-in", keywords: ["checking in online", "checked in online", "app check-in"] },
            { name: "Kiosk check-in", keywords: ["kiosk"] },
          ],
        },
      ],
    },
    {
      name: "In-flight",
      keywords: ["in-flight", "in flight"],
      children: [
        { name: "Cleanliness", keywords: ["dirty", "clean", "crumbs", "spotless"] },
        { name: "Timeliness", keywords: ["delayed", "on time", "boarding delay"] },
        { name: "Attendants", keywords: ["attendant", "attendants", "crew", "flight attendant"] },
      ],
    },
    {
      name: "Post-flight",
      keywords: ["post-flight"],
      children: [
        { name: "Baggage", keywords: ["bag", "bags", "luggage", "baggage", "suitcase"] },
        { name: "Airport departure", keywords: ["leaving the airport", "deplaning", "exit"] },
      ],
    },
  ],
  themes: [
    { name: "Wifi reliability", keywords: ["wifi", "wi-fi", "internet connection"] },
    { name: "Long hold times", keywords: ["on hold", "hold for", "wait time"] },
    { name: "Seat comfort", keywords: ["legroom", "seat recline", "knees jammed", "cramped"] },
    { name: "Gate change confusion", keywords: ["gate changed", "wrong gate", "gate change"] },
  ],
  documents: [
    { docKey: "airline-01", name: "review_01.txt", content: "The attendants were super friendly and checking in online took less than a minute before the flight." },
    { docKey: "airline-02", name: "review_02.txt", content: "My luggage showed up a day late and the baggage claim area was a complete mess." },
    { docKey: "airline-03", name: "review_03.txt", content: "Everything about the in-flight experience felt rushed, and the wifi kept cutting out every twenty minutes." },
    { docKey: "airline-04", name: "review_04.txt", content: "I was on hold for forty minutes before anyone picked up to help with a simple rebooking." },
    { docKey: "airline-05", name: "review_05.txt", content: "The gate changed twice on the app but the board never updated, so half of us were standing at the wrong gate." },
    { docKey: "airline-06", name: "review_06.txt", content: "Checking in online was fast and easy, no complaints there at all." },
    { docKey: "airline-07", name: "review_07.txt", content: "The kiosk at the airport was broken so I had to check in with a human agent, which took forever." },
    { docKey: "airline-08", name: "review_08.txt", content: "Fares have gotten so expensive lately, and the extra fees keep piling up at checkout." },
    { docKey: "airline-09", name: "review_09.txt", content: "We found the flight and booked our tickets through the website without any issues." },
    { docKey: "airline-10", name: "review_10.txt", content: "The plane was noticeably dirty when we boarded, crumbs were all over the tray table." },
    { docKey: "airline-11", name: "review_11.txt", content: "Our flight was delayed by two hours with barely any communication from the gate crew." },
    { docKey: "airline-12", name: "review_12.txt", content: "Leaving the airport after landing was quick since baggage claim was right by the exit." },
    { docKey: "airline-13", name: "review_13.txt", content: "It was a totally unremarkable flight, nothing good or bad really stood out." },
    { docKey: "airline-14", name: "review_14.txt", content: "My knees were jammed against the seat in front of me for the entire six hour flight, cramped the whole way." },
    { docKey: "airline-15", name: "review_15.txt", content: "The security line in the arrival area moved quickly and the attendant at the desk was helpful." },
  ],
};

const hotel: StarterModel = {
  key: "hotel",
  name: "Hotel Guest Experience",
  description: "Booking, stay, and checkout topics covering rooms, amenities, and staff interactions.",
  topics: [
    {
      name: "Booking",
      keywords: ["booking"],
      children: [
        { name: "Reservation Process", keywords: ["reservation", "booked online", "booking confirmation"] },
        { name: "Rate & Pricing", keywords: ["rate", "nightly rate", "discount", "deal"] },
      ],
    },
    {
      name: "Stay",
      keywords: ["our stay", "the stay"],
      children: [
        { name: "Room Quality", keywords: ["the room", "our room", "the bed", "the view"] },
        { name: "Amenities", keywords: ["pool", "gym", "spa", "breakfast buffet"] },
        { name: "Housekeeping", keywords: ["housekeeping", "towels", "room was cleaned"] },
      ],
    },
    {
      name: "Checkout",
      keywords: ["checkout", "check-out"],
      children: [
        { name: "Billing", keywords: ["billed", "charged twice", "invoice"] },
        { name: "Departure Experience", keywords: ["front desk at checkout", "leaving the hotel"] },
      ],
    },
  ],
  themes: [
    { name: "Staff friendliness", keywords: ["friendly staff", "welcoming", "staff were so helpful"] },
    { name: "Noise complaints", keywords: ["noisy", "thin walls", "could hear everything"] },
    { name: "Breakfast quality", keywords: ["breakfast was", "the buffet"] },
  ],
  documents: [
    { docKey: "hotel-01", name: "guest_review_01.txt", content: "Booked online in about two minutes and the reservation confirmation came through instantly." },
    { docKey: "hotel-02", name: "guest_review_02.txt", content: "The room had a beautiful view but the bed was surprisingly uncomfortable for the nightly rate we paid." },
    { docKey: "hotel-03", name: "guest_review_03.txt", content: "Housekeeping left fresh towels every day and the room was cleaned spotlessly." },
    { docKey: "hotel-04", name: "guest_review_04.txt", content: "We were charged twice for the same night and it took three calls to get it sorted out." },
    { docKey: "hotel-05", name: "guest_review_05.txt", content: "The staff were so helpful the entire stay, especially at the front desk." },
    { docKey: "hotel-06", name: "guest_review_06.txt", content: "Our stay was completely ruined because we could hear everything from the room next door, so thin walls throughout." },
    { docKey: "hotel-07", name: "guest_review_07.txt", content: "The breakfast was excellent, the buffet had way more variety than I expected." },
    { docKey: "hotel-08", name: "guest_review_08.txt", content: "Found a great discount rate and the pool and gym were both clean and well maintained." },
    { docKey: "hotel-09", name: "guest_review_09.txt", content: "Leaving the hotel was smooth, the front desk at checkout had our invoice ready in seconds." },
    { docKey: "hotel-10", name: "guest_review_10.txt", content: "Nothing particularly memorable about the trip, it was fine." },
    { docKey: "hotel-11", name: "guest_review_11.txt", content: "The spa was a nice surprise, we hadn't planned on using it but ended up loving it." },
    { docKey: "hotel-12", name: "guest_review_12.txt", content: "Our room was never properly cleaned the whole stay, housekeeping seemed to skip us twice." },
  ],
};

const support: StarterModel = {
  key: "support",
  name: "Support Ticket Triage",
  description: "Issue categories and resolution patterns for inbound customer support tickets.",
  topics: [
    {
      name: "Account",
      keywords: ["account"],
      children: [
        { name: "Login Issues", keywords: ["can't log in", "login", "password reset"] },
        { name: "Billing Disputes", keywords: ["billing", "charged twice", "refund"] },
        { name: "Subscription Changes", keywords: ["cancel my subscription", "downgrade", "upgrade my plan"] },
      ],
    },
    {
      name: "Product",
      keywords: ["the product"],
      children: [
        { name: "Bug Reports", keywords: ["bug", "crashes", "error message"] },
        { name: "Feature Requests", keywords: ["feature request", "would be great if", "wish it had"] },
        { name: "Performance", keywords: ["slow", "lag", "loading forever"] },
      ],
    },
    {
      name: "Onboarding",
      keywords: ["onboarding", "getting started"],
      children: [
        { name: "Setup Help", keywords: ["setup", "set up", "initial configuration"] },
        { name: "Documentation Gaps", keywords: ["documentation", "the docs", "couldn't find any docs"] },
      ],
    },
    {
      name: "Support Experience",
      keywords: ["support team", "your support"],
      children: [
        { name: "Response Time", keywords: ["response time", "took days to reply", "slow to respond"] },
        { name: "Agent Quality", keywords: ["support agent", "the rep", "unhelpful agent"] },
      ],
    },
  ],
  themes: [
    { name: "Frustration signals", keywords: ["frustrated", "ridiculous", "unacceptable"] },
    { name: "Positive resolution", keywords: ["resolved quickly", "fixed right away", "great support"] },
  ],
  documents: [
    { docKey: "ticket-01", name: "ticket_01.txt", content: "I can't log in no matter how many times I reset my password, this is getting ridiculous." },
    { docKey: "ticket-02", name: "ticket_02.txt", content: "Billing charged me twice this month and I need a refund processed as soon as possible." },
    { docKey: "ticket-03", name: "ticket_03.txt", content: "Found a bug where the app crashes every time I try to export a report." },
    { docKey: "ticket-04", name: "ticket_04.txt", content: "Would be great if there was a dark mode, it's a small feature request but it would help a lot." },
    { docKey: "ticket-05", name: "ticket_05.txt", content: "The dashboard has been so slow lately, loading forever every time I switch tabs." },
    { docKey: "ticket-06", name: "ticket_06.txt", content: "During onboarding I couldn't find any docs explaining how to configure the initial setup." },
    { docKey: "ticket-07", name: "ticket_07.txt", content: "Response time from your support team has been terrible, it took days to reply to a simple question." },
    { docKey: "ticket-08", name: "ticket_08.txt", content: "The rep I spoke with was fantastic and resolved quickly, really great support overall." },
    { docKey: "ticket-09", name: "ticket_09.txt", content: "I want to cancel my subscription but can't find where to do it in account settings." },
    { docKey: "ticket-10", name: "ticket_10.txt", content: "Everything has been working fine, just checking in to confirm my plan details." },
    { docKey: "ticket-11", name: "ticket_11.txt", content: "This is unacceptable, I've been frustrated with the constant crashes for weeks now." },
    { docKey: "ticket-12", name: "ticket_12.txt", content: "Support agent was unhelpful and seemed to not understand the actual issue I was describing." },
  ],
};

export const STARTER_MODELS: StarterModel[] = [airline, hotel, support];

export function getStarterModel(key: string): StarterModel | undefined {
  return STARTER_MODELS.find((m) => m.key === key);
}
