export type FaqEntry = { question: string; answer: string; topic: string };

export const PARTNER_FAQS: FaqEntry[] = [
  {
    topic: "Getting started",
    question: "When can I start receiving jobs?",
    answer:
      "Once your business profile is complete and at least one vehicle has been approved by our team, your profile is published and you can start receiving work.",
  },
  {
    topic: "Getting started",
    question: "Do I need to accept the Partner Guidelines?",
    answer:
      "Yes, once, before your first Find Work or Book Now job. You'll be redirected to the Guidelines page automatically the first time you visit either — nothing else on the dashboard is gated behind it.",
  },
  {
    topic: "Vehicles",
    question: "How long does vehicle approval take?",
    answer:
      "Our team reviews submitted vehicles as quickly as possible. You'll see the status change from Submitted to Under review to Approved on your Vehicles page.",
  },
  {
    topic: "Vehicles",
    question: "Can I edit my vehicle after submitting it?",
    answer:
      "Yes — you can update details and re-upload documents at any time. Changing approval status yourself isn't possible once it's out of draft; that's handled by our review team.",
  },
  {
    topic: "Finding work",
    question: "What's the difference between Find Work, Bidding, and Express Interest?",
    answer:
      "Find Work is first-come, first-served: claim a listed job before another partner does. Bidding (Auction Search) is for higher-value jobs — submit a price and the lowest bid wins when the auction closes. Express Interest is for multi-stop journey jobs — register interest with no price attached, and the customer picks who they want from everyone who expressed interest.",
  },
  {
    topic: "Finding work",
    question: "Can I filter which types of jobs I see?",
    answer:
      "Yes — set your job category preferences on the Profile page. Leave everything unchecked to keep seeing every category, or tick specific ones to narrow Find Work, Bidding, and Express Interest to just those.",
  },
  {
    topic: "Finding work",
    question: "How does Route Matcher recommend jobs?",
    answer:
      "Add a route you're regularly driving on the Routes page, and any listed job along that postcode area and direction shows up as a recommendation. It's a discovery aid, not a claim — you still need to go and claim, bid, or express interest through the normal flow.",
  },
  {
    topic: "Finding work",
    question: "What are Watching and Alerts for?",
    answer:
      "Watching lets you bookmark a specific job from Find Work to check back on later. Alerts are saved searches — set filters once (category, postcode area, price range) and matching new jobs show up on the Alerts page as they're listed.",
  },
  {
    topic: "Reservations",
    question: "How do Reservations work?",
    answer:
      "Post your availability (date, van space, crew size) in advance. When a customer's job matches an open reservation, it's assigned to you automatically — first-refusal, ahead of Find Work — instead of you having to go and claim it.",
  },
  {
    topic: "Messages",
    question: "How do message templates work?",
    answer:
      "Save canned replies on the Message Templates page (linked from Messages), then pick one from the dropdown above the message box in any conversation to insert it instead of typing it out.",
  },
  {
    topic: "Messages",
    question: "What shows up in Notifications?",
    answer:
      "System notices about things that happen automatically — right now that's winning an auction. More triggers (reservation matches, express interest selections, vehicle approvals) may be added over time.",
  },
  {
    topic: "Reviews & performance",
    question: "How do customer reviews work?",
    answer:
      "After a job completes, customers can rate you across four categories — Punctuality, Communication, Care of Goods, and Presentation — plus an overall score. Your averages show on the Customer Reviews page.",
  },
  {
    topic: "Reviews & performance",
    question: "How are my Insights numbers calculated?",
    answer:
      "Job counts, ratings, and earnings on the Insights page are computed live from your actual assignments and ratings — not estimates. Some metrics (like on-time percentage) will show \"No data yet\" until there's a real data source feeding them, rather than a made-up number.",
  },
  {
    topic: "Account",
    question: "Can customers pick which partner does their job?",
    answer:
      "Only for Express Interest jobs — the customer sees everyone who expressed interest and chooses. For Find Work and Bidding, it's first-come-first-served or lowest-bid-wins instead.",
  },
  {
    topic: "Account",
    question: "Where do I update my bank details, VAT number, or insurance cover amounts?",
    answer:
      "All on the Profile page — Payment details for bank account and VAT number, and cover amounts sit alongside your insurance document uploads. Bank details are only ever visible to you and Movers Now, never to customers.",
  },
  {
    topic: "Account",
    question: "Is invoicing or payout tracking available yet?",
    answer:
      "Not yet — the Payments page is a placeholder for now. Scheduled/Pending/Transferred tracking, invoices, and CSV export are on the roadmap but not built.",
  },
];
