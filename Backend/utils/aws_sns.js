// Backend/utils/aws_sns.js
// SNS helpers for sending SMS (direct phone) and publishing to a topic.

const AWS = require("aws-sdk");

// Initialize SNS using env credentials/region (SDK also supports IAM roles etc.)
const sns = new AWS.SNS({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

/**
 * Normalize a phone number to E.164.
 * If your DB stores local numbers (e.g., 0401234567) and you want to prepend a
 * default country code automatically, set DEFAULT_SMS_COUNTRY_CODE in .env (e.g., "+358").
 */
function normalizeE164(phone) {
  if (!phone) return null;
  let s = String(phone).trim();

  // Convert "00..." to "+..."
  if (s.startsWith("00")) s = `+${s.slice(1)}`;

  const defaultCC = process.env.DEFAULT_SMS_COUNTRY_CODE || ""; // e.g., "+358"
  // If no leading + and it's only digits, optionally add default CC (strip leading zeros)
  if (!s.startsWith("+") && /^\d{7,15}$/.test(s) && defaultCC) {
    s = defaultCC + s.replace(/^0+/, "");
  }

  // Must be + followed by 7–15 digits
  if (!/^\+\d{7,15}$/.test(s)) return null;
  return s;
}

// Default message attributes for SMS (SNS sandbox may ignore some of these but harmless)
const defaultSmsAttrs = {
  "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
  "AWS.SNS.SMS.SenderID": {
    DataType: "String",
    StringValue: "Mehustaja", // Register if your region/operator requires it
  },
};

/**
 * Send a direct SMS to a single phone number (E.164).
 * Returns AWS MessageId on success.
 */
async function publishDirectSMS(phoneNumber, message, messageAttributes = {}) {
  const to = normalizeE164(phoneNumber);
  if (!to) {
    throw new Error(`Phone number is not E.164 (or cannot be normalized): ${phoneNumber}`);
  }

  const params = {
    Message: message,
    PhoneNumber: to,
    MessageAttributes: { ...defaultSmsAttrs, ...messageAttributes },
  };

  try {
    const { MessageId } = await sns.publish(params).promise();
    console.log(`[SNS] SMS sent to ${to} (MessageId: ${MessageId})`);
    return MessageId;
  } catch (err) {
    console.error(`[SNS] SMS send failed to ${to}:`, err);
    throw err;
  }
}

/**
 * Publish a message to an SNS topic (if you also use topic subscriptions).
 * Returns AWS MessageId on success.
 */
async function publishToTopic(message, subject = "Notification", messageAttributes = {}) {
  const TopicArn = process.env.SNS_TOPIC_ARN;
  if (!TopicArn) throw new Error("SNS_TOPIC_ARN is not set.");

  const params = {
    TopicArn,
    Subject: subject,
    Message: message,
    MessageAttributes: { ...defaultSmsAttrs, ...messageAttributes },
  };

  try {
    const { MessageId } = await sns.publish(params).promise();
    console.log(`[SNS] Published to topic ${TopicArn} (MessageId: ${MessageId})`);
    return MessageId;
  } catch (err) {
    console.error(`[SNS] Topic publish failed:`, err);
    throw err;
  }
}

module.exports = {
  publishDirectSMS,
  publishToTopic,
  normalizeE164, // exported in case you want to reuse/validate numbers elsewhere
};
