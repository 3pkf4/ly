const demoUsers = [
  { id: "user_sara", username: "sara", displayName: "sara", color: "#e60000" },
  { id: "user_omar", username: "omar", displayName: "omar", color: "#2563eb" },
  { id: "user_noura", username: "noura", displayName: "noura", color: "#16a34a" },
];

const storageKeys = {
  users: "mohammed-chat-users-v2",
  currentUser: "mohammed-chat-current-user-v2",
  messages: "mohammed-chat-messages-v2",
};

const authPanel = document.getElementById("authPanel");
const authForm = document.getElementById("authForm");
const usernameInput = document.getElementById("usernameInput");
const authMessage = document.getElementById("authMessage");
const chatApp = document.getElementById("chatApp");
const currentUserBadge = document.getElementById("currentUserBadge");
const logoutButton = document.getElementById("logoutButton");
const clearChat = document.getElementById("clearChat");
const userList = document.getElementById("userList");
const userSearch = document.getElementById("userSearch");
const usersCount = document.getElementById("usersCount");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageButton = messageForm.querySelector("button");
const activeAvatar = document.getElementById("activeAvatar");
const activeName = document.getElementById("activeName");
const activeStatus = document.getElementById("activeStatus");
const typingIndicator = document.getElementById("typingIndicator");

let users = loadUsers();
let currentUser = loadCurrentUser();
let messages = loadMessages();
let activeUserId = null;

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[\p{Script=Arabic}a-zA-Z0-9_]{3,20}$/u.test(username);
}

function createUser(username) {
  const normalized = normalizeUsername(username);
  return {
    id: `user_${Date.now()}_${createToken()}`,
    username: normalized,
    displayName: username.trim(),
    color: createColor(normalized),
  };
}

function createToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function createColor(value) {
  const palette = ["#c40000", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];
  const total = [...value].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return palette[total % palette.length];
}

function loadUsers() {
  const saved = localStorage.getItem(storageKeys.users);
  const savedUsers = saved ? JSON.parse(saved) : [];
  const mergedUsers = [...demoUsers, ...savedUsers];
  return removeDuplicateUsers(mergedUsers);
}

function loadCurrentUser() {
  const saved = localStorage.getItem(storageKeys.currentUser);
  return saved ? JSON.parse(saved) : null;
}

function loadMessages() {
  const saved = localStorage.getItem(storageKeys.messages);
  return saved ? JSON.parse(saved) : {};
}

function saveUsers() {
  const customUsers = users.filter((user) => !demoUsers.some((demoUser) => demoUser.id === user.id));
  localStorage.setItem(storageKeys.users, JSON.stringify(customUsers));
}

function saveCurrentUser() {
  if (currentUser) {
    localStorage.setItem(storageKeys.currentUser, JSON.stringify(currentUser));
    return;
  }

  localStorage.removeItem(storageKeys.currentUser);
}

function saveMessages() {
  localStorage.setItem(storageKeys.messages, JSON.stringify(messages));
}

function removeDuplicateUsers(userListToClean) {
  const seen = new Set();
  return userListToClean.filter((user) => {
    const normalized = normalizeUsername(user.username);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    user.username = normalized;
    return true;
  });
}

function findUser(username) {
  const normalized = normalizeUsername(username);
  return users.find((user) => user.username === normalized);
}

function getChatId(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort().join("__");
}

function getActiveMessages() {
  if (!currentUser || !activeUserId) return [];
  const chatId = getChatId(currentUser.id, activeUserId);
  messages[chatId] = messages[chatId] || [];
  return messages[chatId];
}

function getTime() {
  return new Intl.DateTimeFormat("ar", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function setAuthMessage(text, type = "") {
  authMessage.textContent = text;
  authMessage.className = `form-message ${type}`.trim();
}

function setCurrentUser(user) {
  currentUser = user;
  saveCurrentUser();
  activeUserId = null;
  renderApp();
}

function register(username) {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(username.trim())) {
    setAuthMessage("اسم المستخدم غير صالح. استخدم 3-20 حرفًا بدون مسافات.", "error");
    return;
  }

  if (findUser(normalized)) {
    setAuthMessage("هذا الاسم مستخدم بالفعل، اختر اسمًا مختلفًا.", "error");
    return;
  }

  const newUser = createUser(username);
  users.push(newUser);
  users = removeDuplicateUsers(users);
  saveUsers();
  setAuthMessage("تم إنشاء الحساب بنجاح.", "success");
  setCurrentUser(newUser);
}

function login(username) {
  const user = findUser(username);
  if (!user) {
    setAuthMessage("لم يتم العثور على هذا المستخدم. يمكنك إنشاء حساب جديد بهذا الاسم.", "error");
    return;
  }

  setAuthMessage("تم تسجيل الدخول بنجاح.", "success");
  setCurrentUser(user);
}

function renderApp() {
  const isLoggedIn = Boolean(currentUser);
  authPanel.hidden = isLoggedIn;
  chatApp.hidden = !isLoggedIn;
  logoutButton.hidden = !isLoggedIn;
  clearChat.hidden = !isLoggedIn;
  currentUserBadge.hidden = !isLoggedIn;

  if (!isLoggedIn) return;

  currentUserBadge.textContent = `مسجل باسم: @${currentUser.displayName}`;
  renderUsers(userSearch.value);
  renderConversation();
}

function renderUsers(filter = "") {
  const normalizedFilter = normalizeUsername(filter);
  const availableUsers = users.filter((user) => user.id !== currentUser.id);
  const filteredUsers = availableUsers.filter((user) => user.username.includes(normalizedFilter));
  usersCount.textContent = `${availableUsers.length} متاح`;
  userList.innerHTML = "";

  if (!filteredUsers.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "لا يوجد مستخدم بهذا الاسم. اطلب منه إنشاء اسم مستخدم أولًا.";
    userList.appendChild(empty);
    return;
  }

  filteredUsers.forEach((user) => {
    const button = document.createElement("button");
    const avatar = document.createElement("span");
    const meta = document.createElement("span");
    const name = document.createElement("strong");
    const hint = document.createElement("small");

    button.className = `contact-card${user.id === activeUserId ? " active" : ""}`;
    button.type = "button";
    button.dataset.userId = user.id;
    avatar.className = "avatar";
    avatar.style.background = user.color;
    avatar.textContent = user.displayName.charAt(0).toUpperCase();
    meta.className = "contact-meta";
    name.textContent = `@${user.displayName}`;
    hint.textContent = "اضغط لبدء الدردشة";

    meta.append(name, hint);
    button.append(avatar, meta);
    userList.appendChild(button);
  });
}

function renderConversation() {
  const activeUser = users.find((user) => user.id === activeUserId);
  messagesContainer.innerHTML = "";
  typingIndicator.hidden = true;

  if (!activeUser) {
    activeAvatar.textContent = "؟";
    activeAvatar.style.background = "#777";
    activeName.textContent = "اختر مستخدمًا";
    activeStatus.textContent = "استخدم البحث للعثور على مستخدم وبدء الدردشة";
    messageInput.placeholder = "اختر مستخدمًا أولًا";
    messageInput.disabled = true;
    messageButton.disabled = true;
    messagesContainer.appendChild(createEmptyMessage("لم يتم اختيار محادثة بعد."));
    return;
  }

  activeAvatar.textContent = activeUser.displayName.charAt(0).toUpperCase();
  activeAvatar.style.background = activeUser.color;
  activeName.textContent = `@${activeUser.displayName}`;
  activeStatus.textContent = "محادثة خاصة بينكما";
  messageInput.placeholder = `اكتب رسالة إلى @${activeUser.displayName}`;
  messageInput.disabled = false;
  messageButton.disabled = false;

  const activeMessages = getActiveMessages();
  if (!activeMessages.length) {
    messagesContainer.appendChild(createEmptyMessage("ابدأ المحادثة الآن، لا توجد رسائل بعد."));
  }

  activeMessages.forEach((message) => {
    const bubble = document.createElement("article");
    const text = document.createElement("p");
    const time = document.createElement("time");

    bubble.className = `message ${message.from === currentUser.id ? "sent" : "received"}`;
    text.textContent = message.text;
    time.textContent = message.time;

    bubble.append(text, time);
    messagesContainer.appendChild(bubble);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function createEmptyMessage(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state conversation-empty";
  empty.textContent = text;
  return empty;
}

function addAutoReply(targetUser) {
  typingIndicator.hidden = false;
  window.setTimeout(() => {
    const chatId = getChatId(currentUser.id, targetUser.id);
    messages[chatId].push({
      from: targetUser.id,
      text: `مرحبًا @${currentUser.displayName}، وصلت رسالتك وسأرد عليك قريبًا 😊`,
      time: getTime(),
    });
    saveMessages();
    typingIndicator.hidden = true;
    renderConversation();
  }, 900);
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const mode = event.submitter.value;
  const username = usernameInput.value;

  if (mode === "register") {
    register(username);
    return;
  }

  login(username);
});

logoutButton.addEventListener("click", () => {
  currentUser = null;
  activeUserId = null;
  saveCurrentUser();
  renderApp();
});

userList.addEventListener("click", (event) => {
  const card = event.target.closest(".contact-card");
  if (!card) return;
  activeUserId = card.dataset.userId;
  renderUsers(userSearch.value);
  renderConversation();
  messageInput.focus();
});

userSearch.addEventListener("input", (event) => {
  renderUsers(event.target.value);
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const activeUser = users.find((user) => user.id === activeUserId);
  const text = messageInput.value.trim();
  if (!activeUser || !text) return;

  const activeMessages = getActiveMessages();
  activeMessages.push({ from: currentUser.id, text, time: getTime() });
  messageInput.value = "";
  saveMessages();
  renderConversation();
  addAutoReply(activeUser);
});

clearChat.addEventListener("click", () => {
  if (!currentUser) return;
  messages = Object.fromEntries(
    Object.entries(messages).filter(([chatId]) => !chatId.includes(currentUser.id)),
  );
  saveMessages();
  renderConversation();
});

saveUsers();
renderApp();
