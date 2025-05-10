function autoCommitBookedClass() {
  const bookedClasses = [];

  // Target both #tableAll and .tablebooked tables
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
  chrome.runtime.sendMessage({
    action: "auto_sync_booked_class",
    data: bookedClasses,
  });
}

// autoCommitBookedClass();
