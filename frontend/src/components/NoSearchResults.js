import React from 'react';
import { SearchX } from 'lucide-react';

const NoSearchResults = ({ query, onClear, compact = false }) => (
  <div className={`no-search-state ${compact ? 'compact' : ''}`} role="status">
    <span className="no-search-icon"><SearchX size={compact ? 20 : 27} /></span>
    <strong>No search results</strong>
    <p>{query ? <>We couldn't find a match for “{query}”. Try a shorter or more general term.</> : 'Try a shorter or more general search term.'}</p>
    {onClear && <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>Clear search</button>}
  </div>
);

export default NoSearchResults;
