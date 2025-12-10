// Demo message content for branch creation and testing

export const userMessages = [
  "Hey, how's it going?",
  "That's interesting, tell me more.",
  "What do you think about that?",
  "I see what you mean.",
  "Can you explain further?",
  "That makes sense.",
  "What happens next?",
  "I'm curious about that.",
  "Go on...",
  "Really? That's surprising.",
  "How does that work?",
  "What would you suggest?",
  "I hadn't thought of that.",
  "That's a good point.",
  "Tell me about yourself.",
  "This\nMessage\nIs\nVery\nTall\nTo\nTest\nScrolling",
];

export const botMessages = [
  "I'm doing well, thank you for asking! The magical energies in the glade are particularly vibrant today.",
  "Of course! The ancient forests hold many secrets. Each tree whispers tales of ages past, if you know how to listen.",
  "Well, I believe that every moment holds potential for wonder. Even the smallest creature carries magic within.",
  "The connection between all living things is what sustains the balance. It's delicate, but beautiful.",
  "Certainly. When the moon rises full, the veil between worlds grows thin. That's when the true magic happens.",
  "I sense curiosity in you - that's a gift. Never lose that spark of wonder.",
  "The path forward isn't always clear, but trust your instincts. They'll guide you true.",
  "There's an old saying among my kind: 'The light finds those who seek it.' I've found it to be true.",
  "I could tell you stories that would take a thousand nights. Where shall I begin?",
  "Indeed! The world is full of surprises for those who keep their eyes open.",
  "It's a dance of energies, really. Everything flows and ebbs like the tides.",
  "Listen to the wind. Watch the patterns in the leaves. Nature teaches us everything we need to know.",
  "Few do, at first. Understanding comes with time and patience.",
  "Thank you. I've had centuries to ponder these matters.",
  "I am a guardian of the ancient glade, a keeper of old magics. My purpose is to protect and guide.",
];

export const pickRandomMessage = (isUser: boolean): string => {
  const arr = isUser ? userMessages : botMessages;
  return arr[Math.floor(Math.random() * arr.length)];
};

// Note: Demo data is now seeded from the server database.
// See server/routes/chats.ts for the seed logic.
