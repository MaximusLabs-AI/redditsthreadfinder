import React, { useState } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import Footer from './components/Footer';
import { searchRedditThreads } from './services/redditService';

const TIME_RANGES = [
    { value: 'day', label: 'Past 24h' },
    { value: 'week', label: 'Past week' },
    { value: 'month', label: 'Past month' },
    { value: 'year', label: 'Past year' },
];

function App() {
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('relevance');
    const [timeRange, setTimeRange] = useState('month');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [activeSubreddits, setActiveSubreddits] = useState([]);

    const performSearch = async (kw, sort, range, subs) => {
        if (!kw.trim()) return;
        setIsLoading(true);
        setResult(null);

        try {
            const data = await searchRedditThreads(kw, sort, range, subs);
            setResult(data);
        } catch (error) {
            console.error('Error searching Reddit:', error);
            alert(error.message || 'Failed to search Reddit. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setActiveSubreddits([]);
        performSearch(keyword, sortBy, timeRange, []);
    };

    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        performSearch(keyword, newSort, timeRange, activeSubreddits);
    };

    const handleTimeRangeChange = (newRange) => {
        setTimeRange(newRange);
        setActiveSubreddits([]);
        performSearch(keyword, sortBy, newRange, []);
    };

    const handleSubredditToggle = (subreddit) => {
        const subName = subreddit.replace(/^r\//, '');
        const newSubs = activeSubreddits.includes(subName)
            ? activeSubreddits.filter((s) => s !== subName)
            : [...activeSubreddits, subName];
        setActiveSubreddits(newSubs);
        performSearch(keyword, sortBy, timeRange, newSubs);
    };

    const handleClearSubredditFilter = () => {
        setActiveSubreddits([]);
        performSearch(keyword, sortBy, timeRange, []);
    };

    return (
        <main className="container">
            <Header />
            <InputSection
                keyword={keyword}
                setKeyword={setKeyword}
                isLoading={isLoading}
                onSearch={handleSearch}
                timeRange={timeRange}
                onTimeRangeChange={handleTimeRangeChange}
                timeRanges={TIME_RANGES}
            />
            <OutputSection
                result={result}
                isLoading={isLoading}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                activeSubreddits={activeSubreddits}
                onSubredditToggle={handleSubredditToggle}
                onClearSubredditFilter={handleClearSubredditFilter}
                keyword={keyword}
            />
            <Footer />
        </main>
    );
}

export default App;
