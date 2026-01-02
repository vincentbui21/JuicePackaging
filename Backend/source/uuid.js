const { v4: uuidv4 } = require('uuid');

function generateUUID(){
    const id = uuidv4();
    return id
}

function generateUniqueId() {
    return generateUUID();
}

module.exports = { generateUUID, generateUniqueId }
