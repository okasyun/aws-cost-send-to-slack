import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { IncomingWebhook } from "@slack/webhook";
import {
  fetchCostData,
  sendSlackNotification,
  formatServiceCost,
  calculateMonthlyPeriod,
} from "./utils";

export async function handler() {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    throw new Error(
      "SLACK_WEBHOOK_URL is not defined in environment variables"
    );
  }
  const slackWebhook = new IncomingWebhook(slackWebhookUrl);
  const REGION = process.env.AWS_REGION || "us-east-1";
  const client = new CostExplorerClient({ region: REGION });
  const { start, end } = calculateMonthlyPeriod(new Date());

  try {
    const response = await fetchCostData(client, { start, end });
    const data = response.ResultsByTime?.[0]?.Groups ?? [];
    if (!data || data.length === 0) {
      await sendSlackNotification(slackWebhook, "No cost data found");
      return {
        statusCode: 200,
        body: JSON.stringify("No cost data found"),
      };
    }

    const formattedCost = formatServiceCost(data);
    await sendSlackNotification(
      slackWebhook,
      `今月のコスト(from: ${start} to: ${end}):\n${formattedCost}`
    );
    return {
      statusCode: 200,
      body: JSON.stringify("Cost data fetched successfull"),
    };
  } catch (error) {
    if (error instanceof Error)
      console.error("Failed to fetch cost data", error);
    await sendSlackNotification(slackWebhook, "Failed to fetch cost data");
    return {
      statusCode: 500,
      body: JSON.stringify("Failed to fetch cost data"),
    };
  }
}
