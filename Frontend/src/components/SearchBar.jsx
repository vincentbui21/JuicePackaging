import React, { useState, useEffect } from 'react'; // Import useEffect
import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Custom hook for debouncing
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const SearchBar = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms debounce delay

    // Effect for calling onSearch when debouncedSearchTerm changes
    useEffect(() => {
        onSearch(debouncedSearchTerm);
    }, [debouncedSearchTerm, onSearch]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        // No need to call onSearch here directly, as debouncedSearchTerm useEffect will handle it
    };

    // Removed handleKeyPress as search is now instant
    // const handleKeyPress = (event) => {
    //     if (event.key === 'Enter') {
    //         onSearch(searchTerm);
    //     }
    // };

    return (
        <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by customer name or phone number..."
            value={searchTerm}
            onChange={handleSearchChange}
            // onKeyPress={handleKeyPress} // Removed onKeyPress
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon />
                    </InputAdornment>
                ),
                endAdornment: (
                    <InputAdornment position="end">
                        {searchTerm && (
                            <IconButton onClick={handleClearSearch} edge="end">
                                <ClearIcon />
                            </IconButton>
                        )}
                        {/* The search icon button here will now trigger an immediate search */}
                        <IconButton onClick={() => onSearch(searchTerm)} edge="end">
                            <SearchIcon />
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            sx={{ mb: 3 }}
        />
    );
};

export default SearchBar;
