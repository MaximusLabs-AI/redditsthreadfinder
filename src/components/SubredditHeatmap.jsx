import React from 'react';

export default function SubredditHeatmap({ distribution, activeSubreddits, onToggle, onClear }) {
    if (!distribution || distribution.length === 0) return null;

    const maxCount = distribution[0].count;

    return (
        <div className="heatmap-section">
            <div className="heatmap-header">
                <h3 className="heatmap-title">Subreddit Distribution</h3>
                {activeSubreddits.length > 0 && (
                    <button className="action-btn" onClick={onClear}>
                        Clear filters
                    </button>
                )}
            </div>
            <p className="heatmap-subtitle">
                Click a subreddit to filter results
            </p>
            <div className="heatmap-bars">
                {distribution.map((item) => {
                    const subName = item.name.replace(/^r\//, '');
                    const isActive =
                        activeSubreddits.length === 0 || activeSubreddits.includes(subName);
                    const widthPercent = Math.max((item.count / maxCount) * 100, 8);

                    return (
                        <button
                            key={item.name}
                            className={`heatmap-row ${isActive ? '' : 'dimmed'} ${activeSubreddits.includes(subName) ? 'selected' : ''
                                }`}
                            onClick={() => onToggle(item.name)}
                        >
                            <span className="heatmap-label">{item.name}</span>
                            <div className="heatmap-bar-track">
                                <div
                                    className="heatmap-bar-fill"
                                    style={{ width: `${widthPercent}%` }}
                                />
                            </div>
                            <span className="heatmap-count">{item.count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
