Tool 8: Reddit Threads Finder
8.1 Overview
Tool Name: Reddit Threads Finder
Purpose: Find relevant, active (unlocked) Reddit threads where users can participate to boost brand visibility in AI search. AI chatbots (ChatGPT, Perplexity, Claude) heavily cite Reddit discussions, making Reddit a critical channel for AEO.
Use Case: SEOs and founders who want to get their brand mentioned in Reddit discussions that AI chatbots cite. Marketing teams doing community-driven content distribution.
Complexity: MEDIUM - Requires Reddit public API search + filtering logic. No LLM needed.

8.2 UI Specification
8.2.1 Page Layout
•	Page Header: "Reddit Threads Finder"
•	Subtitle: "Find Reddit threads relevant to your niche. Get mentioned in AI search."

8.2.2 Input Section
•	Text input with placeholder "eg. invoicing software"
•	"Find Reddit Threads ->" button

8.2.3 Loading State
•	"Searching Reddit..." with spinner

8.2.4 Output Section
•	Result count: "Found 23 relevant threads"
•	Thread cards, each showing:
◦	  - Thread title (linked to Reddit URL, opens in new tab)
◦	  - Subreddit name (r/SaaS, r/smallbusiness, etc.)
◦	  - Comment count
◦	  - Post age (e.g., "3 days ago", "2 weeks ago")
◦	  - Status badge: "Open for comments" (green) / "Archived" (gray)
◦	  - Upvote count
◦	  - Relevance indicator
•	Filter/sort options: Sort by relevance / recency / comment count
•	Tip banner: "Pro tip: Provide genuine value in your comments. Reddit hates self-promotion - add real insights first, mention your brand naturally at the end."

8.3 Complete Backend Logic
8.3.1 API Endpoint
Endpoint: POST /api/reddit-threads
Request Body: { "keyword": "invoicing software" }

8.3.2 Option A: Reddit Public JSON API (Recommended)
No API key needed. Free. Rich data (comment count, lock status, etc.):
async function findRedditThreads(keyword) {
  const searchUrl = 'https://www.reddit.com/search.json?'
    + 'q=' + encodeURIComponent(keyword)
    + '&sort=relevance&t=month&limit=50';
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'MaximusLabs-RedditFinder/1.0'
    }
  });
  
  const data = await response.json();
  const threads = data.data.children
    .filter(post => post.data.is_self || post.data.selftext)
    .filter(post => !post.data.locked)
    .filter(post => !post.data.archived)
    .map(post => ({
      title: post.data.title,
      url: 'https://www.reddit.com' + post.data.permalink,
      subreddit: post.data.subreddit_prefixed,
      commentCount: post.data.num_comments,
      upvotes: post.data.ups,
      createdAt: new Date(post.data.created_utc * 1000).toISOString(),
      isLocked: post.data.locked,
      isArchived: post.data.archived,
      selfText: post.data.selftext?.substring(0, 200),
      flair: post.data.link_flair_text,
    }))
    .sort((a, b) => b.upvotes - a.upvotes);
  
  return {
    keyword,
    threadCount: threads.length,
    threads: threads.slice(0, 25),
  };
}

8.3.3 Option B: Google Search API Fallback
Uses Google Custom Search API (or SerpAPI) to find Reddit threads. Better for finding threads that rank in Google (and therefore are also cited by AI chatbots):
async function findRedditThreadsViaGoogle(keyword) {
  const query = 'site:reddit.com ' + keyword;
  
  const response = await fetch(
    'https://serpapi.com/search.json?'
    + 'q=' + encodeURIComponent(query)
    + '&api_key=' + SERP_API_KEY
    + '&num=20'
  );
  const data = await response.json();
  
  return data.organic_results.map(result => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    subreddit: extractSubreddit(result.link),
  }));
}

8.3.4 Recommended Approach
Use Option A (Reddit's public JSON API) as the primary method. It is free, requires no API key, and provides richer data (comment count, lock status, etc.). Fall back to Google search if Reddit rate-limits the request.

8.4 System Prompt
N/A - No LLM involved. Pure API search and filtering.

8.5 Rate Limiting Considerations
•	Reddit's public API is rate-limited to ~30 requests per minute per IP
•	Server-side caching: Cache results for the same keyword for 1 hour in Cloudflare KV
•	User rate limit: 10 searches per IP per hour
