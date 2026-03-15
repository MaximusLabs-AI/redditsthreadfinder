import React, { useState } from 'react';
import {
    ArrowUpRight,
    MessageCircle,
    ArrowUp,
    Clock,
    Flame,
    Copy,
    Check,
    Sparkles,
    Loader2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { generateReplyTemplate } from '../services/redditService';

export default function ThreadCard({ thread, index }) {
    const [expanded, setExpanded] = useState(false);
    const [showReplyPanel, setShowReplyPanel] = useState(false);
    const [brandName, setBrandName] = useState('');
    const [brandDesc, setBrandDesc] = useState('');
    const [reply, setReply] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const hasSnippet = thread.selfText && thread.selfText.trim().length > 0;

    const handleGenerateReply = async () => {
        if (!brandName.trim()) return;
        setIsGenerating(true);
        setReply('');
        try {
            const data = await generateReplyTemplate(thread, brandName, brandDesc);
            setReply(data.reply);
        } catch (err) {
            setReply(`Error: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyReply = () => {
        navigator.clipboard.writeText(reply).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <article
            className="thread-card"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Header row */}
            <div className="thread-card-header">
                <span className="thread-rank">{thread.relevanceRank}</span>
                <a
                    className="thread-title"
                    href={thread.url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {thread.title}
                    <ArrowUpRight
                        size={14}
                        style={{ marginLeft: 6, opacity: 0.4, verticalAlign: 'middle' }}
                    />
                </a>
            </div>

            {/* Snippet preview */}
            {hasSnippet && (
                <div className="thread-snippet-wrapper">
                    <p className={`thread-snippet ${expanded ? 'expanded' : ''}`}>
                        {thread.selfText}
                    </p>
                    {thread.selfText.length > 150 && (
                        <button
                            className="snippet-toggle"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {expanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            )}

            {/* Meta row */}
            <div className="thread-meta">
                <span className="subreddit-badge">{thread.subreddit}</span>

                <span className="thread-meta-item">
                    <ArrowUp size={15} />
                    {thread.upvotes.toLocaleString()}
                </span>

                <span className="thread-meta-item">
                    <MessageCircle size={15} />
                    {thread.commentCount.toLocaleString()}
                </span>

                <span className="thread-meta-item">
                    <Clock size={15} />
                    {thread.age}
                </span>

                <span className={`status-badge ${thread.isArchived ? 'archived' : 'open'}`}>
                    <span className="status-dot" />
                    {thread.isArchived ? 'Archived' : 'Open for comments'}
                </span>

                {thread.engagementLevel === 'high' && (
                    <span className="engagement-badge">
                        <Flame size={13} />
                        High engagement
                    </span>
                )}

                {thread.flair && (
                    <span className="thread-meta-item" style={{ opacity: 0.7 }}>
                        🏷️ {thread.flair}
                    </span>
                )}
            </div>

            {/* Actions row */}
            <div className="thread-actions">
                <button
                    className="action-btn"
                    onClick={() => setShowReplyPanel(!showReplyPanel)}
                >
                    <Sparkles size={14} />
                    {showReplyPanel ? 'Hide Reply Generator' : 'Generate Reply'}
                </button>
            </div>

            {/* Reply template panel */}
            {showReplyPanel && (
                <div className="reply-panel animate-fade-in">
                    <div className="reply-inputs">
                        <div className="reply-input-group">
                            <label className="input-label" htmlFor={`brand-${index}`}>
                                Your Brand Name
                            </label>
                            <input
                                id={`brand-${index}`}
                                type="text"
                                placeholder="eg. InvoiceNinja"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                className="reply-input"
                            />
                        </div>
                        <div className="reply-input-group">
                            <label className="input-label" htmlFor={`desc-${index}`}>
                                What it does (optional)
                            </label>
                            <input
                                id={`desc-${index}`}
                                type="text"
                                placeholder="eg. Open-source invoicing for freelancers"
                                value={brandDesc}
                                onChange={(e) => setBrandDesc(e.target.value)}
                                className="reply-input"
                            />
                        </div>
                        <button
                            className="btn-primary reply-generate-btn"
                            onClick={handleGenerateReply}
                            disabled={isGenerating || !brandName.trim()}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={16} className="spinning" />
                                    Generating…
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate →
                                </>
                            )}
                        </button>
                    </div>

                    {reply && (
                        <div className="reply-output">
                            <div className="reply-output-header">
                                <span className="reply-output-label">Suggested comment</span>
                                <button className="action-btn" onClick={handleCopyReply}>
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="reply-text">{reply}</p>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
