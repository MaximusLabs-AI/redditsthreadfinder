import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err?.message || err);
});

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Groq client (optional — only needed for reply template generation)
// ---------------------------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY;
let groq = null;
if (GROQ_API_KEY) {
    groq = new Groq({ apiKey: GROQ_API_KEY });
    console.log("  ✓ Groq API key loaded — reply template generation enabled");
} else {
    console.log("  ⚠ No GROQ_API_KEY — reply template generation disabled");
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, "dist")));

// ---------------------------------------------------------------------------
// Cache  (key → { data, timestamp })   TTL = 1 hour
// ---------------------------------------------------------------------------
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Per-IP rate limiting  (10 requests / hour)
// ---------------------------------------------------------------------------
const rateLimits = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip) {
    const now = Date.now();
    let entry = rateLimits.get(ip);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        entry = { windowStart: now, count: 0 };
        rateLimits.set(ip, entry);
    }
    entry.count++;
    return entry.count <= RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(isoDate) {
    const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

/**
 * Fetch Reddit search results for a single keyword.
 */
async function fetchRedditSearch(keyword, timeRange = "month") {
    const searchUrl =
        "https://www.reddit.com/search.json?" +
        "q=" + encodeURIComponent(keyword.trim()) +
        "&sort=relevance&t=" + timeRange +
        "&limit=50";

    const response = await fetch(searchUrl, {
        headers: { "User-Agent": "MaximusLabs-RedditFinder/1.0" },
    });

    if (!response.ok) {
        throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();

    return data.data.children
        .filter((post) => post.data.is_self || post.data.selftext)
        .filter((post) => !post.data.locked)
        .filter((post) => !post.data.archived)
        .map((post, index) => {
            const createdAt = new Date(post.data.created_utc * 1000).toISOString();
            const commentCount = post.data.num_comments;
            const upvotes = post.data.ups;

            // Engagement ratio: high comments relative to upvotes = active discussion
            let engagementLevel = "normal";
            if (upvotes > 0 && commentCount / Math.max(upvotes, 1) >= 1.5) {
                engagementLevel = "high";
            } else if (commentCount >= 20) {
                engagementLevel = "high";
            }

            return {
                title: post.data.title,
                url: "https://www.reddit.com" + post.data.permalink,
                subreddit: post.data.subreddit_name_prefixed || ("r/" + post.data.subreddit),
                commentCount,
                upvotes,
                createdAt,
                age: relativeTime(createdAt),
                isLocked: post.data.locked,
                isArchived: post.data.archived,
                selfText: post.data.selftext?.substring(0, 300) || "",
                flair: post.data.link_flair_text,
                relevanceRank: index + 1,
                engagementLevel,
            };
        });
}

// ---------------------------------------------------------------------------
// POST /api/reddit-threads
//   Body: { keyword, sort, timeRange, subreddits }
//   keyword can be comma-separated for multi-keyword search
// ---------------------------------------------------------------------------
app.post("/api/reddit-threads", async (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: "Rate limit exceeded. Max 10 searches per hour.",
        });
    }

    const { keyword, sort, timeRange, subreddits } = req.body;

    if (!keyword || !keyword.trim()) {
        return res.status(400).json({ error: "Keyword is required." });
    }

    const sortBy = sort || "relevance";
    const range = timeRange || "month";
    const filterSubs = Array.isArray(subreddits) && subreddits.length > 0
        ? subreddits.map((s) => s.toLowerCase().replace(/^r\//, ""))
        : null;

    const cacheKey = `${keyword.trim().toLowerCase()}|${sortBy}|${range}|${(filterSubs || []).join(",")}`;

    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`  ↩ Cache hit for "${keyword}"`);
        return res.json(cached);
    }

    console.log(`\n  → Reddit search: "${keyword}" (sort: ${sortBy}, range: ${range})`);

    try {
        // Multi-keyword: split by comma, fetch each, merge, deduplicate
        const keywords = keyword.split(",").map((k) => k.trim()).filter(Boolean);
        const allThreadsMap = new Map(); // deduplicate by URL

        for (const kw of keywords) {
            const threads = await fetchRedditSearch(kw, range);
            for (const t of threads) {
                if (!allThreadsMap.has(t.url)) {
                    allThreadsMap.set(t.url, t);
                }
            }
            // Small delay between requests to be polite to Reddit
            if (keywords.length > 1) {
                await new Promise((r) => setTimeout(r, 500));
            }
        }

        let threads = Array.from(allThreadsMap.values());

        // Subreddit filtering
        if (filterSubs) {
            threads = threads.filter((t) => {
                const sub = t.subreddit.toLowerCase().replace(/^r\//, "");
                return filterSubs.includes(sub);
            });
        }

        // Sort
        if (sortBy === "new") {
            threads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === "comments") {
            threads.sort((a, b) => b.commentCount - a.commentCount);
        } else {
            // relevance  — keep original rank, but re-index
        }

        // Re-index relevance ranks after filtering/sorting
        threads = threads.map((t, i) => ({ ...t, relevanceRank: i + 1 }));

        // Build subreddit distribution for heatmap
        const subredditCounts = {};
        threads.forEach((t) => {
            subredditCounts[t.subreddit] = (subredditCounts[t.subreddit] || 0) + 1;
        });
        const subredditDistribution = Object.entries(subredditCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const result = {
            keyword: keyword.trim(),
            threadCount: threads.length,
            threads: threads.slice(0, 30),
            subredditDistribution,
        };

        setCache(cacheKey, result);
        console.log(`  ✓ Found ${result.threadCount} threads across ${subredditDistribution.length} subreddits`);

        return res.json(result);
    } catch (err) {
        console.error("  ✗ Error:", err.message);
        return res.status(500).json({
            error: err.message || "Failed to search Reddit.",
        });
    }
});

// ---------------------------------------------------------------------------
// POST /api/generate-reply
//   Body: { threadTitle, threadText, subreddit, brandName, brandDescription }
// ---------------------------------------------------------------------------
app.post("/api/generate-reply", async (req, res) => {
    if (!groq) {
        return res.status(503).json({
            error: "Reply generation is unavailable. Set GROQ_API_KEY in .env",
        });
    }

    const { threadTitle, threadText, subreddit, brandName, brandDescription } = req.body;

    if (!threadTitle || !brandName) {
        return res.status(400).json({
            error: "threadTitle and brandName are required.",
        });
    }

    console.log(`\n  → Generating reply for: "${threadTitle.substring(0, 60)}..."`);

    const systemPrompt = `You are an expert Reddit community participant. Your job is to write a helpful, genuine Reddit comment that provides real value to the discussion.

Rules:
1. Start with genuine, helpful advice that directly addresses the thread topic.
2. Be conversational and authentic — sound like a real Reddit user, not a marketer.
3. Provide specific, actionable insights (not generic advice).
4. Only mention the brand ONCE, naturally, toward the end — as a "by the way" or personal recommendation.
5. Keep it 3-5 sentences. Reddit users hate long promotional posts.
6. Never use phrases like "I highly recommend" or "check out" — be subtle.
7. Match the tone of the subreddit (technical for tech subs, casual for general subs).

Output ONLY the comment text, no quotes, no explanation.`;

    const userPrompt = `Thread title: "${threadTitle}"
Thread text: "${threadText || "(no body text)"}"
Subreddit: ${subreddit}
Brand name: ${brandName}
Brand description: ${brandDescription || brandName}

Write a helpful Reddit comment for this thread that subtly mentions the brand.`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_completion_tokens: 512,
            stream: false,
        });

        const reply = completion.choices[0].message.content.trim();
        console.log("  ✓ Reply generated");

        return res.json({ reply });
    } catch (err) {
        console.error("  ✗ Reply generation error:", err.message);
        return res.status(500).json({
            error: err.message || "Failed to generate reply.",
        });
    }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "reddit-threads-finder",
        replyGenerationEnabled: !!groq,
    });
});

// For all other requests, return the frontend index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(
        `\n  🚀 Reddit Threads Finder API running at http://localhost:${PORT}\n`
    );
});
