import React from 'react';
import { Lightbulb, Search as SearchIcon, Download } from 'lucide-react';
import ThreadCard from './ThreadCard';
import SubredditHeatmap from './SubredditHeatmap';
import { exportToCSV } from '../services/redditService';

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'new', label: 'Recency' },
    { value: 'comments', label: 'Comments' },
];

export default function OutputSection({
    result,
    isLoading,
    sortBy,
    onSortChange,
    activeSubreddits,
    onSubredditToggle,
    onClearSubredditFilter,
    keyword,
}) {
    if (isLoading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner-lg" />
                <span className="loading-text">Searching Reddit…</span>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="empty-state">
                <SearchIcon className="empty-state-icon" />
                <h3>Search for a keyword</h3>
                <p>Enter a niche topic to find active Reddit threads where you can participate.</p>
            </div>
        );
    }

    if (result.threadCount === 0) {
        return (
            <div className="empty-state">
                <SearchIcon className="empty-state-icon" />
                <h3>No threads found</h3>
                <p>Try a different or broader keyword, or expand the time range.</p>
            </div>
        );
    }

    const handleExport = () => {
        exportToCSV(result.threads, keyword);
    };

    return (
        <section className="output-section">
            {/* Results header */}
            <div className="results-header">
                <div className="results-header-left">
                    <h2 className="results-count">
                        Found <span>{result.threadCount}</span> relevant threads
                    </h2>
                    <button className="export-btn action-btn" onClick={handleExport}>
                        <Download size={15} />
                        Export CSV
                    </button>
                </div>

                <div className="sort-bar">
                    {SORT_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            className={`sort-btn ${sortBy === opt.value ? 'active' : ''}`}
                            onClick={() => onSortChange(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Subreddit heatmap */}
            <SubredditHeatmap
                distribution={result.subredditDistribution}
                activeSubreddits={activeSubreddits}
                onToggle={onSubredditToggle}
                onClear={onClearSubredditFilter}
            />

            {/* Active filter tags */}
            {activeSubreddits.length > 0 && (
                <div className="active-filters">
                    <span className="active-filters-label">Filtering by:</span>
                    {activeSubreddits.map((sub) => (
                        <span
                            key={sub}
                            className="filter-tag"
                            onClick={() => onSubredditToggle(`r/${sub}`)}
                        >
                            r/{sub} ×
                        </span>
                    ))}
                </div>
            )}

            {/* Thread list */}
            <div className="thread-list">
                {result.threads.map((thread, i) => (
                    <ThreadCard key={thread.url} thread={thread} index={i} />
                ))}
            </div>

            {/* Pro tip */}
            <div className="pro-tip">
                <Lightbulb className="pro-tip-icon" />
                <p>
                    <strong>Pro tip:</strong> Provide genuine value in your comments.
                    Reddit hates self-promotion — add real insights first, mention your
                    brand naturally at the end.
                </p>
            </div>
        </section>
    );
}
