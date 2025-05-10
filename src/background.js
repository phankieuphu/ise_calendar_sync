chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("Booked class", message);

  if (message.action === "add_to_calendar") {
    await addEventToGoogleCalendar(message.data);
  }

  if (message.action === "open_and_check_login") {
    const ISE_COURSE_URL = "https://student.ise.edu.vn/member/course.html";
    chrome.tabs.create(
      { url: ISE_COURSE_URL, active: true },
      function (newTab) {
        const targetTabId = newTab.id;

        chrome.tabs.onUpdated.addListener(function listener(
          tabId,
          changeInfo,
          tab
        ) {
          if (tabId === targetTabId && changeInfo.status === "complete") {
            if (tab.url.includes("login.html")) {
              chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/logo_ise_256.png", // must exist in your extension assets
                title: "ISE Login Required",
                message: "Please log in to continue syncing.",
              });
            }

            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      }
    );
  }
});

async function addEventToGoogleCalendar(bookedClass) {
  try {
    const authToken = await getAuthToken();
    const google_api_url =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    for (const event of bookedClass) {
      const time = setupTime(event);
      try {
        const testUrl = `${google_api_url}?q=${event.bookId}`;
        const checkResponse = await fetch(testUrl, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const existing = await checkResponse.json();
        if (existing.items.length == 0) {
          fetch(google_api_url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(setupTime(event)),
          })
            .then((response) => response.json())
            .then((data) => console.log("Event added:", data))
            .catch((error) => console.error("Error adding event:", error));
        }
      } catch (err) {
        console.log("Error", err);
        return;
      }
    }
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/logo_ise_256.png", // must exist in your extension assets
      title: "Sync booked class success",
      message: "Please check your calendar",
    });
  } catch (err) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/logo_ise_256.png", // must exist in your extension assets
      title: "Sync booked class failed",
      message: "Please contract admin",
    });
  }

  chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension has been installed or updated.", authToken);
  });

  //return;
}

function setupTime(event) {
  const eventDateTime = formatDateTime(event.date, event.time);
  const description = event.level + " ISE:" + event.bookId;
  return {
    summary: event.className,
    location: event.location,
    description: description,
    start: { dateTime: eventDateTime.start, timeZone: "Asia/Ho_Chi_Minh" },
    end: { dateTime: eventDateTime.end, timeZone: "Asia/Ho_Chi_Minh" },
  };
}

function formatDateTime(dateStr, timeStr) {
  const [startTime, endTime] = timeStr.split(" - ");

  // Extract date parts from "Wed, 07 May 2025"
  const [, day, monthName, year] = dateStr.split(" "); // Ignore weekday
  const monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = monthMap[monthName];

  const formattedDate = `${year}-${month}-${day}`;

  return {
    start: `${formattedDate}T${startTime}:00+07:00`,
    end: `${formattedDate}T${endTime}:00+07:00`,
  };
}

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.log("Authentication failed:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}
