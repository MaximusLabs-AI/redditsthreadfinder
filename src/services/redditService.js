export async function searchRedditThreads(keyword, sort = 'relevance', timeRange = 'month', subreddits = []) {
    const response = await fetch('/api/reddit-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, sort, timeRange, subreddits }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return response.json();
}

export async function generateReplyTemplate(thread, brandName, brandDescription) {
    const response = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            threadTitle: thread.title,
            threadText: thread.selfText,
            subreddit: thread.subreddit,
            brandName,
            brandDescription,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return response.json();
}

export function exportToCSV(threads, keyword) {
    const headers = ['Rank', 'Title', 'URL', 'Subreddit', 'Upvotes', 'Comments', 'Age', 'Status', 'Flair', 'Engagement'];
    const rows = threads.map((t) => [
        t.relevanceRank,
        `"${t.title.replace(/"/g, '""')}"`,
        t.url,
        t.subreddit,
        t.upvotes,
        t.commentCount,
        t.age,
        t.isArchived ? 'Archived' : 'Open',
        t.flair || '',
        t.engagementLevel || 'normal',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reddit-threads-${keyword.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
