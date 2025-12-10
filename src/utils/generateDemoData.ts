import { useChatStore } from '../store/chatStore';

/**
 * Generates demo chat data for testing.
 * Creates 300 nodes: 200 in main branch + 100 in alternate branch.
 * 
 * Single responsibility: Demo data generation only.
 */
export function generateDemoData() {
  const store = useChatStore.getState();
  
  // Don't regenerate if data exists
  if (store.nodes.size > 0) return;

  // Add speakers
  const userId = store.addSpeaker({
    name: 'User',
    is_user: true,
    color: '#3498db',
  });
  
  const botId = store.addSpeaker({
    name: 'Bot',
    is_user: false,
    color: '#9b59b6',
  });

  const userMessages = [
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
  ];

  const botMessages = [
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

  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Generate 200 messages alternating between user and bot
  let parentId: string | null = null;
  let branchPointId: string | null = null;
  
  for (let i = 0; i < 200; i++) {
    const isUser = i % 2 === 0;
    const content = pickRandom(isUser ? userMessages : botMessages);
    const speakerId = isUser ? userId : botId;
    
    // Save branch point at message 189
    if (i === 189) {
      branchPointId = parentId;
    }
    
    parentId = store.addMessage(parentId, content, speakerId, !isUser);
  }
  
  // Create alternate branch with 100 messages at position 190
  if (branchPointId) {
    let altParentId = branchPointId;
    
    altParentId = store.addMessage(
      altParentId, 
      "🌟 [ALTERNATE TIMELINE] The story takes a different turn here...", 
      botId, 
      true
    );
    
    for (let i = 0; i < 99; i++) {
      const isUser = i % 2 === 0;
      const content = `[Alt ${i + 2}] ${pickRandom(isUser ? userMessages : botMessages)}`;
      const speakerId = isUser ? userId : botId;
      
      altParentId = store.addMessage(altParentId, content, speakerId, !isUser);
    }
    
    // Switch back to main branch (index 0)
    const branchPointNode = store.nodes.get(branchPointId);
    if (branchPointNode && branchPointNode.child_ids.length > 0) {
      const mainBranchFirstChild = branchPointNode.child_ids[0];
      
      let mainLeafId = mainBranchFirstChild;
      let current = store.nodes.get(mainLeafId);
      while (current && current.child_ids.length > 0) {
        mainLeafId = current.child_ids[current.active_child_index ?? 0];
        current = store.nodes.get(mainLeafId);
      }
      
      store.switchBranch(mainLeafId);
    }
    
    console.log('[Demo] Created 300-node tree');
    console.log('[Demo] Branch at message 190: index 0 = 10 msgs, index 1 = 100 msgs');
  }
}
