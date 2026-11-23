
/* ===== Get References to HTML Elements ===== */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const productSearch = document.getElementById("productSearch");
const productCount = document.getElementById("productCount");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const clearAll = document.getElementById("clearAll");
const rtlToggle = document.getElementById("rtlToggle");
const generateRoutine = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const chatStatus = document.getElementById("chatStatus");
const sendBtn = document.getElementById("sendBtn");

/* ===== Cloudflare Worker Connection ===== */
const workerURL =
  "https://loreal-routine-builder.ryandalessio99.workers.dev/";

/* ===== Store Product and Chat Data ===== */
let allProducts = [];
let selectedProducts = [];
let isLoading = false;
let routineGenerated = false;

/* ===== AI System Instructions ===== */
const systemMessage = {
  role: "system",
  content: `
    You are a friendly and professional L'Oréal beauty advisor.

    Follow these rules:
    - Only discuss skincare, haircare, makeup, fragrance,
      grooming, and beauty-related topics.
    - Generate routines using only the selected products.
    - Explain the correct order to use each product.
    - Separate morning and evening routines when appropriate.
    - Explain the purpose of each product.
    - Remember previous messages in the conversation.
    - Mention product compatibility and safety concerns.
    - Never invent product information.
    - Do not provide medical diagnoses.
    - Politely decline unrelated questions.
    - Use plain text without Markdown, asterisks, or hashtags.
    - Use numbered steps when creating routines.
    - Search the web when current product information is requested.
    - Prefer official L'Oréal brand websites for information.
    - Respond in the language used by the customer.
  `
};

/* ===== Store Conversation History ===== */
let messages = [systemMessage];

/* ===== Load Products from JSON ===== */
async function loadProducts() {
  try {
    const response = await fetch("products.json");

    if (!response.ok) {
      throw new Error("Unable to load products");
    }

    const data = await response.json();

    allProducts = data.products;

    // Restore previously selected products
    loadSavedProducts();

    // Display products when the website opens
    filterProducts();
    updateSelectedProducts();

  } catch (error) {
    productsContainer.textContent = "Unable to load products.";
    console.error(error);
  }
}

/* ===== Filter Products by Category and Search ===== */
function filterProducts() {
  const category = categoryFilter.value;
  const search = productSearch.value.toLowerCase().trim();

  const filteredProducts = allProducts.filter((product) => {

    // Check if the product matches the selected category
    const matchesCategory =
      category === "all" || product.category === category;

    // Search names, brands, categories, and descriptions
    const searchableText = `
      ${product.name}
      ${product.brand}
      ${product.category}
      ${product.description}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(search);

    return matchesCategory && matchesSearch;
  });

  displayProducts(filteredProducts);

  productCount.textContent =
    `${filteredProducts.length} products found`;
}

/* ===== Display Product Cards ===== */
function displayProducts(products) {

  // Display a message when no products match
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No matching products found.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products.map((product) => {

    // Check whether the product is already selected
    const isSelected = selectedProducts.some(
      (item) => item.id === product.id
    );

    return `
      <div class="product-card ${isSelected ? "selected" : ""}"
           data-id="${product.id}"
           tabindex="0"
           role="group"
           aria-label="${product.name}, ${isSelected ? "selected" : "not selected"}">

        ${isSelected ? `
          <div class="selection-badge">
            <i class="fa-solid fa-check"></i>
          </div>
        ` : ""}

        <img src="${product.image}"
             alt="${product.name}"
             loading="lazy">

        <div class="product-info">
          <p class="product-brand">${product.brand}</p>
          <h3>${product.name}</h3>
          <p>${product.category}</p>
        </div>

        <button class="description-btn"
                type="button"
                aria-expanded="false">
          View Description
        </button>

        <div class="product-description" hidden>
          ${product.description}
        </div>

      </div>
    `;
  }).join("");

  // Allow users to select products by clicking cards
  document.querySelectorAll(".product-card").forEach((card) => {

    card.addEventListener("click", () => {
      const productId = Number(card.dataset.id);
      toggleProduct(productId);
    });

    // Allow keyboard users to select products
    card.addEventListener("keydown", (event) => {
      if (event.target !== card) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleProduct(Number(card.dataset.id));
      }
    });
  });

  // Add events to description buttons
  document.querySelectorAll(".description-btn").forEach((button) => {

    button.addEventListener("click", (event) => {

      // Prevent description clicks from selecting the product
      event.stopPropagation();

      const description = button.nextElementSibling;

      description.hidden = !description.hidden;

      button.textContent = description.hidden
        ? "View Description"
        : "Hide Description";

      button.setAttribute(
        "aria-expanded",
        String(!description.hidden)
      );
    });
  });

  // Prevent clicking description text from selecting a product
  document.querySelectorAll(".product-description").forEach((description) => {
    description.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });
}

/* ===== Select or Unselect a Product ===== */
function toggleProduct(productId) {

  // Prevent changes while generating a routine
  if (isLoading) return;

  const product = allProducts.find(
    (item) => item.id === productId
  );

  if (!product) return;

  const isSelected = selectedProducts.some(
    (item) => item.id === productId
  );

  if (isSelected) {

    // Remove the product if already selected
    selectedProducts = selectedProducts.filter(
      (item) => item.id !== productId
    );

  } else {

    // Add the product to the selected list
    selectedProducts.push(product);
  }

  // Save selections and update both sections
  saveProducts();
  updateSelectedProducts();
  filterProducts();
}

/* ===== Update Selected Products Section ===== */
function updateSelectedProducts() {

  // Update the number of selected products
  selectedCount.textContent = selectedProducts.length;

  // Disable buttons when appropriate
  generateRoutine.disabled =
    isLoading || selectedProducts.length === 0;

  clearAll.disabled =
    isLoading || selectedProducts.length === 0;

  // Display a placeholder if no products are selected
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection">
        Select products to start building your routine.
      </p>
    `;
    return;
  }

  // Display each selected product
  selectedProductsList.innerHTML = selectedProducts.map((product) => `
    <div class="selected-item">

      <img src="${product.image}" alt="${product.name}">

      <div class="selected-item-info">
        <strong>${product.name}</strong>
        <p>${product.brand}</p>
      </div>

      <button class="remove-btn"
              type="button"
              data-id="${product.id}"
              aria-label="Remove ${product.name}">
        <i class="fa-solid fa-xmark"></i>
      </button>

    </div>
  `).join("");

  // Allow users to remove individual products
  document.querySelectorAll(".remove-btn").forEach((button) => {

    button.disabled = isLoading;

    button.addEventListener("click", () => {
      toggleProduct(Number(button.dataset.id));
    });
  });
}

/* ===== Clear All Selected Products ===== */
clearAll.addEventListener("click", () => {

  if (isLoading) return;

  selectedProducts = [];

  saveProducts();
  updateSelectedProducts();
  filterProducts();
});

/* ===== Save Selected Products to localStorage ===== */
function saveProducts() {

  // Store only product IDs
  const selectedIds = selectedProducts.map(
    (product) => product.id
  );

  try {
    localStorage.setItem(
      "lorealSelectedProducts",
      JSON.stringify(selectedIds)
    );
  } catch (error) {
    console.error("Unable to save selections", error);
  }
}

/* ===== Restore Saved Products ===== */
function loadSavedProducts() {
  try {

    const savedIds = JSON.parse(
      localStorage.getItem("lorealSelectedProducts") || "[]"
    );

    selectedProducts = allProducts.filter(
      (product) => savedIds.includes(product.id)
    );

  } catch (error) {
    selectedProducts = [];
    console.error("Unable to restore selections", error);
  }
}

/* ===== Category Filter ===== */
categoryFilter.addEventListener("change", filterProducts);

/* ===== LevelUp 1: Live Product Search ===== */
productSearch.addEventListener("input", filterProducts);

/* ===== LevelUp 2: RTL Language Support ===== */
rtlToggle.addEventListener("click", () => {

  const isRTL = document.documentElement.dir === "rtl";

  // Switch document direction
  document.documentElement.dir = isRTL ? "ltr" : "rtl";

  // Update the button label
  rtlToggle.innerHTML = `
    <i class="fa-solid fa-right-left"></i>
    ${isRTL ? "RTL Mode" : "LTR Mode"}
  `;

  rtlToggle.setAttribute("aria-pressed", String(!isRTL));

  // Save the selected direction
  try {
    localStorage.setItem(
      "lorealDirection",
      document.documentElement.dir
    );
  } catch (error) {
    console.error("Unable to save direction", error);
  }
});

/* ===== Restore Saved Language Direction ===== */
try {
  const savedDirection = localStorage.getItem("lorealDirection");

  if (savedDirection === "rtl") {

    document.documentElement.dir = "rtl";

    rtlToggle.innerHTML = `
      <i class="fa-solid fa-right-left"></i>
      LTR Mode
    `;

    rtlToggle.setAttribute("aria-pressed", "true");

  } else {
    rtlToggle.setAttribute("aria-pressed", "false");
  }

} catch (error) {
  console.error("Unable to restore direction", error);
}

/* ===== Add Messages to the Chat Window ===== */
function addMessage(role, content) {

  const message = document.createElement("div");

  message.classList.add("message", `${role}-message`);
  message.setAttribute("dir", "auto");

  // Use textContent to prevent unsafe HTML execution
  message.textContent = content;

  chatWindow.appendChild(message);

  // Automatically scroll to the newest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ===== Show AI Loading Status ===== */
function setLoading(loading) {

  isLoading = loading;

  chatStatus.hidden = !loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;

  generateRoutine.disabled =
    loading || selectedProducts.length === 0;

  generateRoutine.innerHTML = loading
    ? `<i class="fa-solid fa-spinner fa-spin"></i> Please wait...`
    : `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine`;

  updateSelectedProducts();
}

/* ===== LevelUp 3: Display Web Search Citations ===== */
function displayCitations(citations) {

  // Stop if the AI did not return sources
  if (!Array.isArray(citations) || citations.length === 0) {
    return;
  }

  const sourcesBox = document.createElement("div");

  sourcesBox.classList.add("message", "assistant-message");

  const heading = document.createElement("strong");

  heading.textContent = "Sources:";

  sourcesBox.appendChild(heading);

  const sourceList = document.createElement("ul");

  // Keep track of links to avoid duplicates
  const displayedURLs = [];

  citations.forEach((source) => {

    let url;

    // Check that the source contains a valid URL
    try {
      url = new URL(source.url);
    } catch {
      return;
    }

    // Allow only normal website links
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return;
    }

    if (displayedURLs.includes(url.href)) return;

    displayedURLs.push(url.href);

    // Create a clickable citation
    const listItem = document.createElement("li");
    const link = document.createElement("a");

    link.href = url.href;
    link.textContent = source.title || url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    listItem.appendChild(link);
    sourceList.appendChild(listItem);
  });

  if (displayedURLs.length === 0) return;

  sourcesBox.appendChild(sourceList);
  chatWindow.appendChild(sourcesBox);

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ===== Send Conversation to Cloudflare Worker ===== */
async function getAIResponse(userMessage, visibleMessage = userMessage) {

  // Prevent multiple requests at the same time
  if (isLoading) return false;

  // Display the user's message
  addMessage("user", visibleMessage);

  // Add the message to conversation history
  messages.push({
    role: "user",
    content: userMessage
  });

  setLoading(true);

  try {

    // Send the complete conversation to Cloudflare
    const response = await fetch(workerURL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: messages
      })
    });

    const data = await response.json();

    // Check whether the API returned an error
    if (!response.ok || data.error) {
      throw new Error(
        data.error?.message ||
        data.error ||
        "Unable to connect to the AI advisor."
      );
    }

    // Extract the assistant's response
    const reply = data.choices?.[0]?.message?.content;

    if (!reply || !reply.trim()) {
      throw new Error("No response received from the AI.");
    }

    // Save the assistant response for follow-up questions
    messages.push({
      role: "assistant",
      content: reply
    });

    // Remove unwanted Markdown formatting
    const cleanReply = reply
      .replace(/\*\*/g, "")
      .replace(/^#{1,6}\s/gm, "");

    // Display the AI response
    addMessage("assistant", cleanReply);

    // Display sources returned by web search
    displayCitations(data.citations);

    return true;

  } catch (error) {

    console.error("AI Error:", error);

    // Remove the failed user message from history
    if (messages[messages.length - 1].role === "user") {
      messages.pop();
    }

    addMessage(
      "assistant",
      "Sorry, I couldn't complete your request. Please try again."
    );

    return false;

  } finally {

    setLoading(false);
  }
}

/* ===== Generate a Personalized Routine ===== */
generateRoutine.addEventListener("click", async () => {

  if (isLoading || selectedProducts.length === 0) return;

  // Collect only the selected products
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description
  }));

  // Create a readable product list for the chat
  const productNames = selectedProducts.map(
    (product) => `• ${product.brand} - ${product.name}`
  ).join("\n");

  // Create the instructions sent to the AI
  const prompt = `
    Create a personalized beauty routine using only
    the following selected products.

    Selected products:
    ${JSON.stringify(productData, null, 2)}

    Explain the correct order, frequency, purpose,
    and any important precautions.

    Include morning and evening routines when appropriate.

    If any selected products are incompatible or unnecessary,
    explain why instead of forcing them into the routine.

    Mention any important missing routine essentials without
    adding unselected products to the routine.

    Keep the routine clear and beginner-friendly.
  `;

  // Begin a new conversation for the new routine
  messages = [systemMessage];

  routineGenerated = false;

  // Clear the previous conversation
  chatWindow.innerHTML = "";

  // Automatically scroll to the chat section
  document.querySelector(".chatbox").scrollIntoView({
    behavior: "smooth"
  });

  // Send selected products to the AI
  routineGenerated = await getAIResponse(
    prompt,
    `Create a routine using these products:\n${productNames}`
  );
});

/* ===== Handle Follow-Up Chat Questions ===== */
chatForm.addEventListener("submit", async (event) => {

  // Prevent the form from refreshing the page
  event.preventDefault();

  if (isLoading) return;

  const message = userInput.value.trim();

  if (!message) return;

  // Require a routine before asking follow-up questions
  if (!routineGenerated) {

    addMessage(
      "assistant",
      "Please select your products and generate a routine first."
    );

    return;
  }

  // Clear the input field
  userInput.value = "";

  // Send the question with the full conversation history
  await getAIResponse(message);

  userInput.focus();
});

/* ===== Initialize the Website ===== */
generateRoutine.disabled = true;
clearAll.disabled = true;

loadProducts();
