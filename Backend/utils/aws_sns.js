const AWS = require("aws-sdk");

const sns = new AWS.SNS({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});


const publishDirectSMS = async (phoneNumber, message) => {
    try {
      await sns.publish({
        Message: message,
        PhoneNumber: phoneNumber, // E.164 format e.g. +358401234567
      }).promise();
  
      console.log(`SMS sent to ${phoneNumber}`);
    } catch (err) {
      console.error("Failed to send SMS:", err);
    }
  };
  
  module.exports = { publishDirectSMS };
  