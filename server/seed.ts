import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedData() {
  console.log("🌱 Seeding demo data...");

  // Create users
  const demoUsers = [
    {
      email: "alice@evconnect.com",
      password: "password123",
      displayName: "Alice Chen",
      bio: "Tesla Model 3 owner. Love long road trips!",
      vehicle: { brand: "Tesla", model: "Model 3", year: 2023, batteryCapacity: 75 },
      role: "USER",
    },
    {
      email: "bob@evconnect.com",
      password: "password123",
      displayName: "Bob Martinez",
      bio: "New to EVs, excited to learn",
      vehicle: { brand: "Chevrolet", model: "Bolt EV", year: 2024, batteryCapacity: 66 },
      role: "USER",
    },
    {
      email: "carol@evconnect.com",
      password: "password123",
      displayName: "Carol Kim",
      bio: "EV enthusiast and sustainability advocate",
      vehicle: { brand: "Nissan", model: "Leaf", year: 2022, batteryCapacity: 62 },
      role: "MODERATOR",
    },
    {
      email: "admin@evconnect.com",
      password: "password123",
      displayName: "Admin User",
      bio: "Platform administrator",
      role: "ADMIN",
    },
  ];

  const userIds: string[] = [];
  for (const userData of demoUsers) {
    const user = await storage.createUser({
      email: userData.email,
      passwordHash: await hashPassword(userData.password),
      role: userData.role,
      status: "ACTIVE",
    });

    await storage.createProfile({
      userId: user.id,
      displayName: userData.displayName,
      bio: userData.bio,
      avatarUrl: null,
      location: null,
      vehicle: userData.vehicle,
      interests: null,
    });

    userIds.push(user.id);
  }

  console.log(`✅ Created ${userIds.length} users`);

  // Create communities
  const communities = [
    {
      name: "Tesla Owners",
      slug: "tesla-owners",
      type: "BRAND",
      description: "Community for Tesla owners and enthusiasts",
      moderators: [userIds[0]],
    },
    {
      name: "EV Charging Tips",
      slug: "ev-charging-tips",
      type: "GENERAL",
      description: "Share charging tips, tricks, and best practices",
      moderators: [userIds[2]],
    },
    {
      name: "Long Range Drivers",
      slug: "long-range-drivers",
      type: "GENERAL",
      description: "For EV owners who love road trips",
      moderators: [userIds[0]],
    },
    {
      name: "Budget EVs",
      slug: "budget-evs",
      type: "GENERAL",
      description: "Affordable electric vehicle discussion",
      moderators: [userIds[1]],
    },
  ];

  const communityIds: string[] = [];
  for (const communityData of communities) {
    const community = await storage.createCommunity(communityData);
    communityIds.push(community.id);

    // Have some users join communities
    await storage.joinCommunity({ communityId: community.id, userId: userIds[0] });
    await storage.joinCommunity({ communityId: community.id, userId: userIds[1] });
    if (Math.random() > 0.5) {
      await storage.joinCommunity({ communityId: community.id, userId: userIds[2] });
    }
  }

  console.log(`✅ Created ${communityIds.length} communities`);

  // Create posts
  const posts = [
    {
      authorId: userIds[0],
      communityId: communityIds[0],
      text: "Just completed my first 500-mile road trip in my Model 3! The Supercharger network made it so easy. Anyone else done long trips recently?",
      visibility: "PUBLIC",
    },
    {
      authorId: userIds[1],
      communityId: communityIds[1],
      text: "Pro tip: Charge to 80% for daily driving to preserve battery health. Only charge to 100% before long trips!",
      visibility: "PUBLIC",
    },
    {
      authorId: userIds[2],
      communityId: communityIds[1],
      text: "Found an amazing free charging station at my local library. Check your community centers!",
      visibility: "PUBLIC",
    },
    {
      authorId: userIds[0],
      communityId: null,
      text: "Beautiful sunset drive today. EVs are so peaceful and quiet 🌅",
      visibility: "PUBLIC",
    },
    {
      authorId: userIds[1],
      communityId: communityIds[3],
      text: "Just got my Bolt EV! Any tips for a new EV owner?",
      visibility: "PUBLIC",
    },
  ];

  const postIds: string[] = [];
  for (const postData of posts) {
    const post = await storage.createPost(postData);
    postIds.push(post.id);

    // Add some likes
    const likers = [userIds[0], userIds[1], userIds[2]].filter(id => id !== postData.authorId);
    for (const likerId of likers.slice(0, Math.floor(Math.random() * 3))) {
      await storage.togglePostLike(post.id, likerId);
    }
  }

  console.log(`✅ Created ${postIds.length} posts`);

  // Create comments
  const comments = [
    {
      postId: postIds[0],
      authorId: userIds[1],
      text: "That's awesome! How many charging stops did you need?",
    },
    {
      postId: postIds[0],
      authorId: userIds[2],
      text: "The Supercharger network is a game changer for road trips!",
    },
    {
      postId: postIds[4],
      authorId: userIds[0],
      text: "Welcome to the EV family! Download a charging app like PlugShare or ChargePoint.",
    },
    {
      postId: postIds[4],
      authorId: userIds[2],
      text: "Congrats! The Bolt is a great choice. Join the Budget EVs community!",
    },
  ];

  for (const commentData of comments) {
    await storage.createComment(commentData);
  }

  console.log(`✅ Created ${comments.length} comments`);

  // Create charging stations
  const stations = [
    {
      externalId: null,
      name: "Downtown ChargePoint Station",
      coords: { lat: 37.7749, lng: -122.4194 },
      address: "123 Market St, San Francisco, CA 94103",
      connectors: [
        { type: "CCS", powerKW: 150 },
        { type: "CHAdeMO", powerKW: 50 },
      ],
      provider: "ChargePoint",
      pricing: "$0.28/kWh",
      availability: "AVAILABLE",
      addedBy: userIds[0],
    },
    {
      externalId: null,
      name: "Tesla Supercharger - Highway 101",
      coords: { lat: 37.3861, lng: -122.0839 },
      address: "456 El Camino Real, Mountain View, CA 94040",
      connectors: [
        { type: "Tesla Supercharger", powerKW: 250 },
      ],
      provider: "Tesla",
      pricing: "$0.25/kWh",
      availability: "AVAILABLE",
      addedBy: userIds[0],
    },
    {
      externalId: null,
      name: "Electrify America - Shopping Center",
      coords: { lat: 34.0522, lng: -118.2437 },
      address: "789 Main St, Los Angeles, CA 90012",
      connectors: [
        { type: "CCS", powerKW: 350 },
        { type: "CHAdeMO", powerKW: 50 },
      ],
      provider: "Electrify America",
      pricing: "$0.43/kWh",
      availability: "AVAILABLE",
      addedBy: userIds[1],
    },
  ];

  const stationIds: string[] = [];
  for (const stationData of stations) {
    const station = await storage.createStation(stationData);
    stationIds.push(station.id);

    // Add some bookmarks
    if (Math.random() > 0.5) {
      await storage.createBookmark({
        userId: userIds[0],
        targetType: "STATION",
        targetId: station.id,
      });
    }
  }

  console.log(`✅ Created ${stationIds.length} charging stations`);

  // Create questions
  const questions = [
    {
      authorId: userIds[1],
      title: "How often should I charge my EV battery?",
      body: "I'm new to EVs and wondering about charging frequency. Should I charge every night or wait until it gets low?",
      tags: ["battery", "charging", "maintenance"],
    },
    {
      authorId: userIds[0],
      title: "Best apps for finding charging stations?",
      body: "Looking for recommendations on charging station finder apps. What do you all use?",
      tags: ["apps", "charging", "tools"],
    },
    {
      authorId: userIds[1],
      title: "Winter driving range - is it normal to lose 30%?",
      body: "I've noticed my range drops significantly in cold weather. Is this normal? Any tips to improve winter range?",
      tags: ["range", "winter", "battery"],
    },
  ];

  const questionIds: string[] = [];
  for (const questionData of questions) {
    const question = await storage.createQuestion(questionData);
    questionIds.push(question.id);

    // Add some upvotes
    await storage.toggleQuestionUpvote(question.id, userIds[0]);
    if (Math.random() > 0.5) {
      await storage.toggleQuestionUpvote(question.id, userIds[2]);
    }
  }

  console.log(`✅ Created ${questionIds.length} questions`);

  // Create answers
  const answers = [
    {
      questionId: questionIds[0],
      authorId: userIds[2],
      body: "Charge daily if you have a home charger! Keep it between 20-80% for optimal battery health. Only charge to 100% before long trips.",
    },
    {
      questionId: questionIds[0],
      authorId: userIds[0],
      body: "I charge every night to 80%. It's convenient and better for the battery long-term.",
    },
    {
      questionId: questionIds[1],
      authorId: userIds[2],
      body: "PlugShare is my favorite! It has user reviews and real-time availability. Also use ChargePoint and the Tesla app.",
    },
    {
      questionId: questionIds[2],
      authorId: userIds[0],
      body: "Yes, 20-30% range loss in winter is completely normal. The battery needs energy to warm itself. Precondition your car while plugged in to help.",
    },
  ];

  for (const answerData of answers) {
    const answer = await storage.createAnswer(answerData);
    // Add upvotes to answers
    await storage.toggleAnswerUpvote(answer.id, userIds[0]);
    if (Math.random() > 0.5) {
      await storage.toggleAnswerUpvote(answer.id, userIds[1]);
    }
  }

  // Mark first question as solved
  await storage.updateQuestion(questionIds[0], {
    solvedAnswerId: (await storage.getAnswers(questionIds[0]))[0].id,
  });

  console.log(`✅ Created ${answers.length} answers`);

  // Create articles
  const articles = [
    {
      kind: "NEWS",
      title: "New EV Tax Credit Changes for 2025",
      summary: "Important updates to federal EV tax credits that could save you thousands.",
      body: "The federal government has announced new changes to EV tax credits for 2025. Eligible buyers can now receive up to $7,500 in tax credits for new EVs and $4,000 for used EVs. However, there are new income restrictions and vehicle price caps to be aware of...",
      coverImageUrl: null,
      tags: ["tax-credits", "news", "policy"],
      authorId: userIds[3],
    },
    {
      kind: "TIPS",
      title: "Top 5 Tips for Extending Your EV Battery Life",
      summary: "Simple habits that can add years to your EV battery.",
      body: "1. Avoid charging to 100% daily - stick to 80% for regular use. 2. Don't let your battery drop below 20% frequently. 3. Park in shade or garage during hot weather. 4. Use regenerative braking. 5. Precondition your battery in extreme temperatures...",
      coverImageUrl: null,
      tags: ["battery", "maintenance", "tips"],
      authorId: userIds[3],
    },
    {
      kind: "KNOWLEDGE",
      title: "Understanding EV Charging Levels: L1, L2, and DC Fast Charging",
      summary: "A comprehensive guide to different charging speeds and when to use them.",
      body: "Level 1 (120V): Standard household outlet, 2-5 miles of range per hour. Good for overnight charging. Level 2 (240V): Dedicated home charger or public station, 10-60 miles per hour. Best for daily charging. DC Fast Charging: Public high-speed chargers, 100-300 miles in 30 minutes. Use for road trips...",
      coverImageUrl: null,
      tags: ["charging", "education", "knowledge"],
      authorId: userIds[3],
    },
  ];

  for (const articleData of articles) {
    await storage.createArticle(articleData);
  }

  console.log(`✅ Created ${articles.length} articles`);

  console.log("🎉 Seed data complete!");
}
