import axios from "axios";

export async function refreshAccessToken(refreshToken) {
  const response = await axios.post(
    "https://oauth2.googleapis.com/token",
    null,
    {
      params: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data; // { access_token, expires_in, scope, token_type }
}

export async function getGoogleCalendarEvents(accessToken, refreshToken) {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      const { access_token } = await refreshAccessToken(refreshToken);
      return getGoogleCalendarEvents(access_token, refreshToken);
    }
    return null;
  }
}

export async function isTimeSlotFree(accessToken, startTimeISO, endTimeISO) {
  try {
    const response = await axios.post(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        timeMin: startTimeISO,
        timeMax: endTimeISO,
        items: [{ id: "primary" }],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const busySlots = response.data.calendars.primary.busy;

    console.log("Busy slots:", busySlots);

    return busySlots.length === 0; // true = free, false = busy
  } catch (error) {
    if (error.response?.status === 401) {
      return "access token expired";
    }
    console.error(
      "Error checking free/busy:",
      error.response?.data || error.message
    );
    return null;
  }
}

export async function createGoogleCalendarEvent(accessToken, eventDetails) {
  try {
    const response = await axios.post(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        summary: eventDetails.summary,
        description: eventDetails.description || "",
        start: {
          dateTime: eventDetails.startTimeISO,
          timeZone: "Asia/Kolkata", // your local timezone
        },
        end: {
          dateTime: eventDetails.endTimeISO,
          timeZone: "Asia/Kolkata",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data; // contains the event ID and details
  } catch (error) {
    if (error.response?.status === 401) {
      return "access token expired";
    }
    return null;
  }
}
