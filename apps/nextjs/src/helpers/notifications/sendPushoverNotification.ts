const MAX_PUSHOVER_MESSAGE_LENGTH = 1_000;
const MAX_PUSHOVER_TITLE_LENGTH = 250;

const formatMessage = (output: string) => {
  const normalizedOutput = output.replace(/\r/g, "").trim();
  if (normalizedOutput.length === 0) return "No output available.";
  if (normalizedOutput.length <= MAX_PUSHOVER_MESSAGE_LENGTH)
    return normalizedOutput;
  const maxTailLength = MAX_PUSHOVER_MESSAGE_LENGTH - 40;
  return `...\n${normalizedOutput.slice(-maxTailLength)}`;
};

export const sendPushoverNotification = async (
  title: string,
  message: string,
) => {
  const token = process.env.PUSHOVER_TOKEN ?? process.env.PUSHOVER_APP_TOKEN;
  const user = process.env.PUSHOVER_USER ?? process.env.PUSHOVER_USER_KEY;

  if (!token || !user) {
    console.warn("Pushover credentials missing. Skipping notification.");
    return;
  }

  try {
    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body: new URLSearchParams({
        token,
        user,
        title: title.slice(0, MAX_PUSHOVER_TITLE_LENGTH),
        message: formatMessage(message),
      }),
    });

    if (!response.ok) {
      console.error(
        "Failed to send Pushover notification:",
        await response.text(),
      );
    }
  } catch (error) {
    console.error("Failed to send Pushover notification:", error);
  }
};
