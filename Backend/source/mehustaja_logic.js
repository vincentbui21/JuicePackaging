
function caculated_price(apple_weight) {
    return Number(parseFloat(apple_weight).toFixed(2))
}

function formatDateToSQL(dateStr) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}


module.exports = {caculated_price, formatDateToSQL}