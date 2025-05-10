document.getElementById("syncBtn").addEventListener("click", async () => {
  const ISE_COURSE_URL = "https://student.ise.edu.vn/member/course.html";
  const ISE_DOMAIN = "https://student.ise.edu.vn";
  const ISE_LOGIN = "https://student.ise.edu.vn/member/login.html";

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (tab.url == ISE_COURSE_URL) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: extractBookedClasses,
        },
        (results) => {
          chrome.runtime.sendMessage({
            action: "add_to_calendar",
            data: results[0].result,
          });
        }
      );
    }
    if (tab.url == ISE_LOGIN || !tab.url.includes("student.ise.edu.vn")) {
      chrome.runtime.sendMessage({
        action: "open_and_check_login",
      });
    }
    if (tab.url.includes("student.ise.edu.vn") && tab.url !== ISE_COURSE_URL) {
      await chrome.tabs.update(tab.id, { url: ISE_COURSE_URL });

      // Wait for the tab to finish loading course.html
      chrome.tabs.onUpdated.addListener(function listener(
        tabId,
        info,
        updatedTab
      ) {
        if (
          tabId === tab.id &&
          info.status === "complete" &&
          updatedTab.url === ISE_COURSE_URL
        ) {
          chrome.tabs.onUpdated.removeListener(listener); // clean up

          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: () => {
                const bookedClasses = [];
                const tables = document.querySelectorAll(
                  "#tableAll, .tablebooked"
                );

                tables.forEach((table) => {
                  const rows = table.querySelectorAll("tbody tr");

                  rows.forEach((row) => {
                    const getText = (selector) => {
                      const el = row.querySelector(selector);
                      return el ? el.textContent.trim() : "";
                    };

                    const time = getText(".i-time");
                    const date = getText(".i-date");
                    const className = getText(".i-class");
                    const level = getText(".i-level");
                    const locationCell = row.querySelector("td:nth-of-type(4)");
                    const location = locationCell
                      ? locationCell.textContent.trim()
                      : "";

                    const cancelBtn = row.querySelector(".btnCancle");
                    const bookId = cancelBtn?.getAttribute("bookid") || "";

                    if (bookId) {
                      bookedClasses.push({
                        time,
                        date,
                        className,
                        level,
                        location,
                        bookId,
                      });
                    }
                  });
                });

                return bookedClasses;
              },
            },
            (results) => {
              //.  const booked = results[0]?.result || [];
              chrome.runtime.sendMessage({
                action: "add_to_calendar",
                data: results[0]?.result,
              });
            }
          );
        }
      });
    }
  });
  //  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
});
async function openAndCheckTab(ISE_COURSE_URL) {
  chrome.tabs.create({ url: ISE_COURSE_URL, active: true }, function (newTab) {
    // newTab.id is what we need to track
    const targetTabId = newTab.id;
    chrome.runtime.sendMessage({
      action: "cookies",
      value: "Please login",
    });
    // Now listen for the tab update
    chrome.tabs.onUpdated.addListener(function listener(
      tabId,
      changeInfo,
      tab
    ) {
      if (tabId === targetTabId && changeInfo.status === "complete") {
        if (tab.url.includes("login.html")) {
          chrome.runtime.sendMessage({
            action: "cookies",
            value: "Please login",
          });
        }

        chrome.tabs.onUpdated.removeListener(listener); // Clean up
      }
    });
  });
}
// Function runs in the tab's context
function extractBookedClasses() {
  const bookedClasses = [];
  const tables = document.querySelectorAll("#tableAll, .tablebooked");

  tables.forEach((table) => {
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach((row) => {
      const getText = (selector) => {
        const el = row.querySelector(selector);
        return el ? el.textContent.trim() : "";
      };

      const time = getText(".i-time");
      const date = getText(".i-date");
      const className = getText(".i-class");
      const level = getText(".i-level");
      const locationCell = row.querySelector("td:nth-of-type(4)");
      const location = locationCell ? locationCell.textContent.trim() : "";

      const cancelBtn = row.querySelector(".btnCancle");
      const bookId = cancelBtn?.getAttribute("bookid") || "";

      if (bookId) {
        bookedClasses.push({ time, date, className, level, location, bookId });
      }
    });
  });

  return bookedClasses;
}
