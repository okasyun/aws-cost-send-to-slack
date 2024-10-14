import { IncomingWebhook } from "@slack/webhook";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  Group,
} from "@aws-sdk/client-cost-explorer";

export const formatServiceCost = (data: Group[]): string => {
  let totalAmount = 0;
  const formattedData = data.map((entry) => {
    const serviceName = entry.Keys?.[0] ?? "Unknown Service";
    const amount = parseFloat(entry.Metrics?.UnblendedCost.Amount ?? "0");
    totalAmount += amount;
    return `${serviceName}: $${amount.toFixed(2)}`;
  });
  return [...formattedData, `Total: $${totalAmount.toFixed(2)}`].join(`\n`);
};

export const sendSlackNotification = async (
  slackWebhook: IncomingWebhook,
  message: string
) => {
  try {
    await slackWebhook.send(message);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Slack notification failed", error);
      throw new Error(`Slack notification failed: ${error.message}`);
    } else {
      console.error("Slack notification failed");
      throw new Error("Slack notification failed with unknown error");
    }
  }
};

export const fetchCostData = async (
  client: CostExplorerClient,
  { start, end }: { start: string; end: string }
) => {
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: start, End: end },
    Granularity: "MONTHLY",
    Metrics: ["UnblendedCost"],
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
  });
  return await client.send(command);
};

export const calculateMonthlyPeriod = (
  currentDate: Date
): { start: string; end: string } => {
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const end = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};
