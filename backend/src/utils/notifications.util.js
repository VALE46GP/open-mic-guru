const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({ region: process.env.REACT_APP_AWS_REGION });

async function sendNotification(message, topicArn) {
  try {
    const params = {
      Message: JSON.stringify(message),
      TopicArn: topicArn
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

module.exports = {
  sendNotification
}; 