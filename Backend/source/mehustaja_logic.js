
function caculated_price(apple_weight) {
    return Number(parseFloat(apple_weight).toFixed(2))
}

function formatDateToSQL(dateStr) {
    if (!dateStr) return null;

    // If ISO-like string, e.g. '2025-06-23T21:00:00.000Z'
    if (dateStr.includes('-') && dateStr.includes('T')) {
        const date = new Date(dateStr);
        if (isNaN(date)) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

  // Otherwise assume MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}


module.exports = {caculated_price, formatDateToSQL}