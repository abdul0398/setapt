// Define days
const daysOfWeek = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

onStart();
//######## Saving client selected state in local storage ##########
function onStart(params) {
  if (localStorage.getItem("selected_client")) {
    const selected_client = localStorage.getItem("selected_client");
    const client = document.querySelector(`[mid="${selected_client}"]`);
    if (client) {
      client.classList.add("selected_client");
      client.classList.remove("unselected_client");
      populateAutomationsBasedOnAgent(client);
    }
  } else {
    const client = document.querySelector(".clientsname_div li");
    if (client) {
      client.classList.add("selected_client");
      client.classList.remove("unselected_client");
      populateAutomationsBasedOnAgent(client);
    }
  }
  // openLastCreatedProfile();
}

const overlay = document.getElementById("overlay");

overlay.addEventListener("click", () => {
  closeAllPopups();
  overlay.style.display = "none";
});

function closeAllPopups() {
  document.getElementsByClassName("questionContainer").innerHTML = "";
  let openPopups = document.querySelectorAll(".open_popup");
  openPopups.forEach(function (element) {
    element.classList.remove("open_popup");
    element.classList.add("close_popup");
  });
  overlay.style.display = "none";
  document.getElementsByTagName("body")[0].style.overflow = "auto";
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function openpopup(event) {
  closeAllPopups();
  const menuDiv = document.getElementsByClassName("agent-add-popup");
  menuDiv[0].classList.add("open_popup");
  overlay.style.display = "block";
}

function openEventPopup(eventData = null) {
  // closeAllPopups();
  const menuDiv = document.getElementsByClassName("event-add-popup");
  menuDiv[0].classList.add("open_popup");
  overlay.style.display = "block";
  clearForm();
  const clientid = document
    .querySelector(".selected_client")
    .getAttribute("mid");

  const title = document.getElementById("popup-title");
  const idInput = document.getElementById("eventId");
  const eventTitleInput = document.getElementById("eventTitle");
  const eventDescriptionInput = document.getElementById("eventDescription");
  const eventDurationInput = document.getElementById("eventDuration");
  const eventStatusSelect = document.getElementById("eventStatus");

  // Reset fields
  idInput.value = "";
  eventTitleInput.value = "";
  eventDescriptionInput.value = "";
  eventDurationInput.value = "";
  eventStatusSelect.value = "active";

  if (eventData) {
    title.innerText = "Edit Event";

    idInput.value = eventData.id || "";
    eventTitleInput.value = eventData.title || "";
    eventDescriptionInput.value = eventData.description || "";
    eventDurationInput.value = eventData.duration || "";
    eventStatusSelect.value = eventData.status || "active";
  } else {
    title.innerText = "Add Event";
  }
}

async function submitEvent() {
  overlay.style.display = "block";
  const agentID = document
    .getElementsByClassName("selected_client")[0]
    .getAttribute("mid");
  const id = document.getElementById("eventId").value;
  const title = document.getElementById("eventTitle").value;
  const description = document.getElementById("eventDescription").value;
  const duration = document.getElementById("eventDuration").value;
  const status = document.getElementById("eventStatus").value;

  let is_valid_duration = true;
  if (duration < 5 || duration > 60) {
    is_valid_duration = false;
  }

  if (!title || !duration || !is_valid_duration) {
    if (!title) {
      Swal.fire("Error", "Title is required!", "error");
    } else if (!duration || !is_valid_duration) {
      Swal.fire("Error", "Duration must be between 5 and 60 minutes!", "error");
    }
    return;
  }

  const eventData = {
    title,
    description,
    duration: parseInt(duration),
    status,
    agentID,
  };

  let url = "/api/event/create";
  let method = "POST";

  if (id) {
    url = `/api/event/update/${id}`;
    method = "PUT";
  }

  showLoadingOverlay();
  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentID: agentID,
        ...eventData,
      }),
    });
    const resData = await res.json();
    if (res.status >= 200 && res.status < 300) {
      window.location.reload();
    } else {
      hideLoadingOverlay();
      swal.fire({
        title: "Error",
        text: resData.message,
        icon: "error",
        confirmButtonText: "Ok",
        confirmButtonColor: "#002655",
      });
      return;
    }
  } catch (error) {
    alert(error.message);
  }
}

function clearForm() {
  const formElements = document.querySelectorAll("input, textarea");

  formElements.forEach((element) => {
    element.value = "";
  });
}

document.getElementById("btn_add_agent_popup").addEventListener("click", () => {
  openpopup();
});

async function addAgentHandler(btn) {
  const container = btn.parentElement.parentElement;
  const name = container.querySelector("#agentName").value;
  const email = container.querySelector("#agentEmail").value;
  const password = container.querySelector("#agentPassword").value;
  const confirmPassword = container.querySelector("#confirmPassword").value;

  if (password != confirmPassword) {
    swal.fire({
      title: "Invalid Password",
      text: "Password and Confirm Password do not match",
      icon: "question",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    });
    return;
  }

  if (!isValidEmail(email)) {
    swal.fire({
      title: "Invalid Email",
      text: "Please enter a valid email",
      icon: "question",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    });
    return;
  }

  if (!name || name.length < 3) {
    swal.fire({
      title: "Invalid Name(Atleast 3 Letters)",
      text: "",
      icon: "question",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    });
    return;
  }

  showLoadingOverlay();
  try {
    const res = await fetch("/api/agent/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        email: email,
        password: password,
      }),
    });
    const resData = await res.json();
    hideLoadingOverlay();
    if (res.status == 200) {
      localStorage.setItem("selected_client", resData.id);
      closeAllPopups();
      swal
        .fire({
          title: "Success",
          text: resData.message,
          icon: "success",
          confirmButtonText: "Ok",
          confirmButtonColor: "#002655",
        })
        .then(() => {
          window.location.reload();
        });
    } else {
      swal.fire({
        title: "Error",
        text: resData.message,
        icon: "error",
        confirmButtonText: "Ok",
        confirmButtonColor: "#002655",
      });
      return;
    }
  } catch (error) {
    alert(error.message);
  }
}

function open_popup_option(event) {
  closeAllPopups();
  const menuIconDiv = event.target.closest(".menu_icon_div");
  if (!menuIconDiv) return;
  const menu_popup = menuIconDiv.nextElementSibling;
  if (menu_popup && menu_popup.classList.contains("close_popup")) {
    menu_popup.classList.remove("close_popup");
    menu_popup.classList.add("open_popup");
  }
  overlay.style.display = "block";
}

function clearclientSelected(curr_elem) {
  document.querySelectorAll(".clientsname_div li").forEach((element) => {
    element.classList.remove("selected_client");
    element.classList.add("unselected_client");
  });
  curr_elem.classList.remove("unselected_client");
  curr_elem.classList.add("selected_client");
}

async function populateAutomationsBasedOnAgent(curr_elem) {
  document.getElementById("show_profiles_div").classList.remove("d-none");
  const agentid = curr_elem.getAttribute("mid");
  const { agent, events } = await fetchAgentDetails(agentid);
  const showformdiv = document.getElementById("show_profiles");
  showformdiv.innerHTML = "";
  showformdiv.innerHTML = `
                <div>
                    <button style="border-radius: 30px; background-color: #002655; color: white;" onclick="openEventPopup()" class="btn btn-lg">Add New Event</button>
                </div>
               `;

  if (!events || events.length == 0) {
    showformdiv.innerHTML = `
                <div>
                    <button style="border-radius: 30px; background-color: #002655; color: white;" onclick="openEventPopup()" class="btn btn-lg">Add New Event</button>
                </div>
                <h4 class="text-center" > No Events </h4>
                `;
  } else {
    events.forEach((event) => {
      showformdiv.innerHTML += `            
                    <div class="d-flex mt-3 forms_div">
                        <div topic="project" style="outline: 0px solid transparent; align-items: center; height: 100%;" class="d-flex ps-4">${
                          event.name + `(${event.id})`
                        }</div> 
                        
                        <div class="options_div ms-auto" > 
                          <button title="Copy event link" class="big_icon btn btn-sm me-2 mt-3" slug="${
                            event.slug
                          }" onclick="copyEventLink(this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                            <path fill="white" d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                          </svg>
                          </button>
                           

                        

                           
                            
                            
                            
                            <a title="Delete Form" onclick="deleteevent(this)" eventId="${
                              event.id
                            }" class="big_icon mt-3 btn-sm btn btn-danger me-2" >
                            <i class="fa-solid fa-trash" style="font-size: 15px;"></i>
                            </a>
    
                            <a title="Delete Form" onclick="deleteevent(this)" eventId="${
                              event.id
                            }" class="small_icon mt-3 ms-4">
                                <i class="fa-solid fa-trash"></i>
                            </a>
    
                            <button title="Edit Form" style="background-color:#002655" onclick="editEvent(this)" eventId="${
                              event.id
                            }"  class="big_icon btn btn-sm btn-facebook mt-3 me-2">
                                Edit
                            </button>
    
                            <button title="Edit Form" style="background-color:transparent !important" onclick="editEvent(this)" eventId="${
                              event.id
                            }"  class="small_icon mt-3 ms-4 me-3">
                                <i class="fa-solid fa-pen-to-square" style="color: #213454;"></i> 
                            </button>
                        </div>
                    </div> `;
    });
  }
  // editableDivHandler();
}

function copyEventLink(btn) {
  const slug = btn.getAttribute("slug");
  // Replace with your actual webhook URL or text
  const baseUrl = window.location.origin;
  const webhookUrl = `${baseUrl}/event/${slug}`;

  // Use the Clipboard API to write text
  navigator.clipboard
    .writeText(webhookUrl)
    .then(() => {
      // Optionally, notify the user that the webhook was copied
      alert("Event link copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy event link", err);
    });
}

function clientListener(curr_elem) {
  localStorage.setItem("selected_client", curr_elem.getAttribute("mid"));
  document.querySelector(".overlay_loading").style.display = "block";
  clearclientSelected(curr_elem);
  populateAutomationsBasedOnAgent(curr_elem);
  document.querySelector(".overlay_loading").style.display = "none";
}

async function fetchAgentDetails(clientid) {
  const res = await fetch(`/api/agent/fetch/${clientid}`, {
    method: "GET",
  });
  const data = await res.json();
  return data;
}

const searchInput = document.getElementById("search_agent");

searchInput.addEventListener("input", function () {
  const searchValue = searchInput.value.toLowerCase();

  // Get the list of client names in the <li> elements
  const clientItems = document.querySelectorAll(".clientsname_div li");

  // Loop through the list items and hide those that don't match the search query
  clientItems.forEach(function (item) {
    // If the client name includes the search value, show the item; otherwise, hide it
    if (item.textContent.toLowerCase().includes(searchValue)) {
      item.style.display = ""; // or 'block' or 'flex' depending on your layout
    } else {
      item.style.display = "none";
    }
  });
});

async function agentEditPopup(elem) {
  const agentID = elem.getAttribute("agentid");

  document.querySelector(".overlay_loading").style.display = "block";
  const { agent } = await fetchAgentDetails(agentID);
  document.querySelector(".overlay_loading").style.display = "none";

  document.getElementById("agent-name-edit").value = agent.name;
  document.getElementById("agent-email-edit").value = agent.email;
  document.getElementById("agent-delete-btn").setAttribute("agentid", agent.id);
  const agentEditPopup = document.querySelector(".agentEditPopup");
  document
    .getElementById("agent-edit-post-btn")
    .setAttribute("agentId", agent.id);
  agentEditPopup.classList.add("open_popup");
  agentEditPopup.classList.remove("close_popup");

  overlay.style.display = "block";
}

async function editClientPost() {
  const name = document.getElementById("agent-name-edit").value;
  const password = document.getElementById("agent-password-edit").value;
  const confirmPassword = document.getElementById(
    "agent-confirm-password-edit"
  ).value;
  const agentId = document
    .getElementById("agent-edit-post-btn")
    .getAttribute("agentId");
  document.querySelector(".overlay_loading").style.display = "block";

  if (!name || name.length < 3) {
    swal.fire({
      title: "Enter Valid Name (More than 3 Letters)",
      text: "",
      icon: "question",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    });
    return;
  }

  if (password && (password != confirmPassword || password.length < 8)) {
    swal.fire({
      title:
        "Password must be more than 8 characters and match with confirm password",
      text: "",
      icon: "question",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    });
    return;
  }

  const res = await fetch(`/api/agent/update/${agentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      password: password,
    }),
  });
  const resData = await res.json();
  hideLoadingOverlay();
  if (res.status != 200) {
    Swal.fire({
      title: "Error",
      text: resData.message,
      icon: "error",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    });
  } else if (res.status >= 200 && res.status < 300) {
    Swal.fire({
      title: "Success",
      text: resData.message,
      icon: "success",
      confirmButtonText: "Ok",
      confirmButtonColor: "#002655",
    }).then(() => {
      window.location.reload();
    });
  }
}

async function deleteAgent(elem) {
  Swal.fire({
    title: "Do you want to Delete the Agent?",
    showCancelButton: true,
    confirmButtonText: "Delete",
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoadingOverlay();
      const id = elem.getAttribute("agentid");
      const res = await fetch(`/api/agent/delete/${id}`, {
        method: "GET",
      });
      hideLoadingOverlay();
      if (res.status >= 200 && res.status < 300) {
        Swal.fire({
          title: "Success",
          text: "Agent Deleted Successfully",
          icon: "success",
          confirmButtonText: "Ok",
          confirmButtonColor: "#002655",
        }).then(() => {
          window.location.reload();
        });
      } else {
        swal.fire({
          title: "Error",
          text: resData.message,
          icon: "error",
          confirmButtonText: "Ok",
          confirmButtonColor: "#002655",
        });
      }
    } else if (result.isDenied) {
      hideLoadingOverlay();
      Swal.fire("Changes are not saved", "", "info");
    }
  });
}

async function editEvent(btn) {
  const eventId = btn.getAttribute("eventId");
  const { event } = await fetcheventById(eventId);
  openEventPopup({
    id: eventId,
    title: event.name,
    description: event.description,
    duration: event.duration,
    status: event.status,
  });
}

async function fetcheventById(id) {
  const res = await fetch(`/api/event/fetch/${id}`, {
    method: "GET",
  });
  const data = await res.json();
  return data;
}

async function populateeventEditDialog(eventDetails) {
  const dialog = document.querySelector("dialog");
  dialog.setAttribute("eventId", eventDetails.id);
  dialog.showModal();
}

async function closeEditDiv() {
  document.querySelector(".profile_edit_container").style.display = "none";
  const elem = document.getElementsByClassName("selected_client")[0];
  document.getElementById("step1").style.display = "block";
  document.getElementById("step2").style.display = "none";
  populateAutomationsBasedOnAgent(elem);
}

function showLoadingOverlay() {
  const overlay = document.querySelector(".overlay_loading");
  overlay.style.display = "block";
}

function hideLoadingOverlay() {
  const overlay = document.querySelector(".overlay_loading");
  overlay.style.display = "none";
}

function closeDialog(elem) {
  const dialog = elem.parentElement;
  dialog.close();
}

async function deleteevent(btn) {
  Swal.fire({
    title: "Do you want to Delete the event?",
    showCancelButton: true,
    confirmButtonText: "Delete",
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoadingOverlay();
      const eventId = btn.getAttribute("eventId");
      const res = await fetch(`/api/event/delete/${eventId}`, {
        method: "GET",
      });
      const resData = await res.json();
      hideLoadingOverlay();
      if (res.status >= 200 && res.status < 300) {
        Swal.fire({
          title: "Success",
          text: resData.message,
          icon: "success",
          confirmButtonText: "Ok",
          confirmButtonColor: "#002655",
        }).then(() => {
          window.location.reload();
        });
      } else {
        Swal.fire({
          title: "Error",
          text: resData.message,
          icon: "error",
          confirmButtonText: "Ok",
          confirmButtonColor: "#002655",
        });
      }
    }
  });
}

// Agent Availability Popup

async function agentAvailabilityPopup(elem) {
  const agentID = elem.getAttribute("agentid");
  const { availabilityRules } = await fetchAvailabilityRules(agentID);
  populateAgentAvailabilityDialog(availabilityRules, agentID);
}

async function connectGoogleCalendar(btn) {
  const agentID = document
    .getElementById("availability-popup")
    .getAttribute("agentid");

  // Show loading state
  saveBtnHandler(btn, "Connecting...", true, "#002655", "white");

  try {
    // Redirect to Google OAuth consent screen
    const response = await fetch(`/api/agent/google-auth-url/${agentID}`);
    const data = await response.json();

    if (data.authUrl) {
      // Open Google OAuth consent screen in a new window
      const width = 600;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        data.authUrl,
        "Google Calendar Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for the OAuth callback
      window.addEventListener("message", async (event) => {
        if (event.data === "google_auth_success") {
          saveBtnHandler(btn, "Connected", true, "green", "white");
          // Update the button to show disconnect option
          btn.innerHTML =
            '<i class="fab fa-google me-2"></i>Disconnect Google Calendar';
          btn.onclick = () => disconnectGoogleCalendar(btn);
        }
      });
    }
  } catch (error) {
    console.error("Error connecting to Google Calendar:", error);
    saveBtnHandler(btn, "Error Connecting", true, "red", "white");
    setTimeout(() => {
      saveBtnHandler(btn, "Connect Google Calendar", false, null, null);
    }, 2000);
  }
}

async function disconnectGoogleCalendar(btn) {
  const agentID = document
    .getElementById("availability-popup")
    .getAttribute("agentid");

  try {
    const response = await fetch(`/api/agent/disconnect-google/${agentID}`, {
      method: "POST",
    });

    if (response.ok) {
      saveBtnHandler(btn, "Disconnected", true, "gray", "white");
      setTimeout(() => {
        saveBtnHandler(btn, "Connect Google Calendar", false, null, null);
        btn.onclick = () => connectGoogleCalendar(btn);
      }, 2000);
    }
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    saveBtnHandler(btn, "Error Disconnecting", true, "red", "white");
    setTimeout(() => {
      saveBtnHandler(btn, "Disconnect Google Calendar", false, null, null);
    }, 2000);
  }
}

async function populateAgentAvailabilityDialog(availabilityRules, agentID) {
  const dialog = document.querySelector("#availability-popup");
  const form = dialog.querySelector("#availability-form");
  const btn = form.querySelector("button");
  const availabilityContainer = dialog.querySelector("#availability-days");

  // Reset form completely (prevent duplicate inputs)
  availabilityContainer.innerHTML = "";

  // Render day selectors fresh
  daysOfWeek.forEach((day) => {
    const dayBlock = document.createElement("div");
    dayBlock.classList.add(
      "d-flex",
      "align-items-center",
      "gap-2",
      "justify-content-between"
    );

    dayBlock.innerHTML = `
      <input type="checkbox" id="day-${day.value}" name="days" value="${day.value}" />
      <label for="day-${day.value}" class="w-25">${day.label}</label>
      <input type="time" name="start-${day.value}" disabled class="form-control" style="width: 120px;">
      <input type="time" name="end-${day.value}" disabled class="form-control" style="width: 120px;">
    `;
    availabilityContainer.appendChild(dayBlock);
  });

  // Add event listeners for each checkbox
  availabilityContainer
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const dayValue = this.value;
        const startInput = this.parentElement.querySelector(
          `input[name="start-${dayValue}"]`
        );
        const endInput = this.parentElement.querySelector(
          `input[name="end-${dayValue}"]`
        );

        if (startInput) startInput.disabled = !this.checked;
        if (endInput) endInput.disabled = !this.checked;
      });
    });

  // Now populate the checkboxes with existing data
  if (availabilityRules && Array.isArray(availabilityRules)) {
    availabilityRules.forEach((rule) => {
      const { day_of_week, start_time, end_time } = rule;
      const dayCheckbox = form.querySelector(`#day-${day_of_week}`);
      const startInput = form.querySelector(
        `input[name="start-${day_of_week}"]`
      );
      const endInput = form.querySelector(`input[name="end-${day_of_week}"]`);

      if (dayCheckbox && startInput && endInput) {
        dayCheckbox.checked = true;
        startInput.disabled = false;
        endInput.disabled = false;

        startInput.value = start_time.slice(0, 5); // "09:00:00" → "09:00"
        endInput.value = end_time.slice(0, 5); // "17:00:00" → "17:00"
      }
    });
  }

  // Set agentID attributes if needed
  dialog.setAttribute("agentid", agentID);
  btn.setAttribute("agentid", agentID);

  // Optional: reset save button if you want (your custom saveBtnHandler)
  if (typeof saveBtnHandler === "function") {
    saveBtnHandler(btn, "Save Availability", false, null, null);
  }

  // Check Google Calendar connection status
  try {
    const response = await fetch(`/api/agent/google-status/${agentID}`);
    const data = await response.json();

    if (data.connected) {
      const googleBtn = form.querySelector(
        'button[onclick="connectGoogleCalendar(this)"]'
      );

      googleBtn.style.backgroundColor = "green !important";
      googleBtn.style.color = "white !important";
      if (googleBtn) {
        googleBtn.innerHTML = '<i class="fab fa-google me-2"></i>Connected';
        googleBtn.onclick = () => {
          return;
        };
      }
    }
  } catch (error) {
    console.error("Error checking Google Calendar status:", error);
  }

  dialog.showModal();
}

async function saveAvailability(btn) {
  const form = btn.parentElement;
  saveBtnHandler(btn, "Saving...", true, "#002655", "white");

  const availabilityRules = [];

  daysOfWeek.forEach((day) => {
    const dayCheckbox = document.getElementById(`day-${day.value}`);
    if (dayCheckbox.checked) {
      const startTime = form.elements[`start-${day.value}`].value;
      const endTime = form.elements[`end-${day.value}`].value;

      if (startTime && endTime) {
        availabilityRules.push({
          day_of_week: day.value,
          start_time: startTime,
          end_time: endTime,
        });
      }
    }
  });

  const agentID = document
    .getElementById("availability-popup")
    .getAttribute("agentid");

  const res = await fetch(`/api/agent/update-availability/${agentID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      availabilityRules,
    }),
  });

  const resData = await res.json();
  if (res.status >= 200 && res.status < 300) {
    saveBtnHandler(btn, "Saved", true, "green", "white");
  }
}

function closeDialog(elem) {
  elem.closest("dialog").close();
}

async function fetchAvailabilityRules(agentID) {
  const res = await fetch(`/api/agent/fetch-availability/${agentID}`, {
    method: "GET",
  });
  const data = await res.json();
  return data;
}

function populateAvailabilityRules(availabilityRules) {
  console.log(availabilityRules);
  const dialog = document.querySelector("#availability-popup");
  const form = dialog.querySelector("#availability-form");
  const availabilityContainer = dialog.querySelector("#availability-days");

  // First, clear/reset form (uncheck all, disable all time inputs)
  form.reset();
  availabilityContainer
    .querySelectorAll("input[type='checkbox']")
    .forEach((checkbox) => {
      const startInput = form.elements[`start-${checkbox.value}`];
      const endInput = form.elements[`end-${checkbox.value}`];

      checkbox.checked = false;
      if (startInput) startInput.disabled = true;
      if (endInput) endInput.disabled = true;
    });

  // Now, pre-fill availability based on existing rules
  availabilityRules.forEach((rule) => {
    const { dayOfWeek, startTime, endTime } = rule;
    const checkbox = form.elements["days"];
    const checkboxArray = Array.isArray(checkbox) ? checkbox : [checkbox]; // single or multiple checkboxes

    const dayCheckbox = checkboxArray.find(
      (cb) => Number(cb.value) === Number(dayOfWeek)
    );
    if (dayCheckbox) {
      dayCheckbox.checked = true;

      const startInput = form.elements[`start-${dayOfWeek}`];
      const endInput = form.elements[`end-${dayOfWeek}`];

      if (startInput) {
        startInput.disabled = false;
        startInput.value = startTime.slice(0, 5); // "09:00:00" -> "09:00"
      }
      if (endInput) {
        endInput.disabled = false;
        endInput.value = endTime.slice(0, 5); // "17:00:00" -> "17:00"
      }
    }
  });
}

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

function saveBtnHandler(btn, text, disabled, color, textColor) {
  btn.disabled = disabled;
  btn.innerHTML = text;
  if (color) {
    btn.style.backgroundColor = `${color} !important`;
  }
  if (textColor) {
    btn.style.color = `${textColor} !important`;
  }
}
