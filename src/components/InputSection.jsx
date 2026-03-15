import React from 'react';
import { Search, Clock } from 'lucide-react';

export default function InputSection({
    keyword,
    setKeyword,
    isLoading,
    onSearch,
    timeRange,
    onTimeRangeChange,
    timeRanges,
}) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            onSearch();
        }
    };

    return (
        <section className="input-section">
            <label className="input-label" htmlFor="keyword-input">
                Search Keywords
            </label>
            <div className="input-row">
                <input
                    id="keyword-input"
                    type="text"
                    placeholder="eg. invoicing software, billing tool, invoice generator"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <button
                    className="btn-primary"
                    onClick={onSearch}
                    disabled={isLoading || !keyword.trim()}
                >
                    {isLoading ? (
                        <>
                            <span className="loading-spinner" />
                            Searching…
                        </>
                    ) : (
                        <>
                            <Search size={18} />
                            Find Reddit Threads →
                        </>
                    )}
                </button>
            </div>

            <p className="input-hint">
                Tip: Use commas to search multiple keywords at once. Results are merged and deduplicated.
            </p>

            {/* Time Range Selector */}
            <div className="time-range-section">
                <span className="time-range-label">
                    <Clock size={14} />
                    Time range
                </span>
                <div className="time-range-bar">
                    {timeRanges.map((opt) => (
                        <button
                            key={opt.value}
                            className={`time-range-btn ${timeRange === opt.value ? 'active' : ''}`}
                            onClick={() => onTimeRangeChange(opt.value)}
                            disabled={isLoading}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
