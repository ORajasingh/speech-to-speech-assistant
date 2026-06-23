import GeminiClient from "./GeminiClient.js";
import MediaHandler from "./MediaHandler.js";

const transcript =
document.getElementById("transcript");

const status =
document.getElementById("status");

const liveBtn =
document.getElementById("live-button");

const micBtn =
document.getElementById("mic-button");

const input =
document.getElementById("message-input");

const form =
document.getElementById("chat-form");

const sessionList =
document.getElementById("session-list");

const newChatButton =
document.getElementById("new-chat-button");

const mediaHandler =
new MediaHandler();

let sessionId =
localStorage.getItem(
"speechAssistantSessionId"
) || crypto.randomUUID();

localStorage.setItem(
"speechAssistantSessionId",
sessionId
);

function addMessage(role,text){

document
.querySelector(".empty-state")
?.remove();

const div =
document.createElement("div");

div.className =
`message ${role}`;

div.innerHTML =
`<b>${
role==="user"
? "You"
: "Gemini"
}:</b> ${text}`;

transcript.appendChild(div);

transcript.scrollTop =
transcript.scrollHeight;

console.log(
"ADDING MESSAGE",
role,
text
);

}

async function saveConversation(
userText,
assistantText
){

try{

await fetch(
  "/api/save",
  {
    method:"POST",

    headers:{
      "Content-Type":
      "application/json"
    },

    body:
    JSON.stringify({

      sessionId,

      userText,

      assistantText,

      language:"auto",

      languageName:"Auto"

    })

  }
);

await loadSessions();

}
catch(err){

console.log(err);

}

}

const gemini =
new GeminiClient({

onOpen(){

status.textContent =
"Connected";

liveBtn.textContent =
"Stop Live";

liveBtn.classList.add(
"active"
);

},

onClose(){

status.textContent =
"Disconnected";

liveBtn.textContent =
"Start Live";

liveBtn.classList.remove(
"active"
);

},

onError(err){

console.log(err);

status.textContent =
"Error";

},

onMessage(event){

const msg =
JSON.parse(event.data);

console.log(
"GEMINI RESPONSE",
msg
);

if(
msg.serverContent
?.inputTranscription
?.text
){

addMessage(
"user",
msg.serverContent
.inputTranscription
.text
);

}

if(
msg.serverContent
?.outputTranscription
?.text
){

addMessage(
"assistant",
msg.serverContent
.outputTranscription
.text
);

saveConversation(

msg.serverContent
.inputTranscription
?.text || "",

msg.serverContent
.outputTranscription
.text

);

}

const parts =
msg.serverContent
?.modelTurn
?.parts;

if(parts){

for(
const part
of parts
){

if(
part.thought
){
continue;
}

if(
part.text
){

addMessage(
"assistant",
part.text
);

}

if(
part.inlineData
&&
part.inlineData
.mimeType
.includes(
"audio"
)
){

mediaHandler.playAudio(
part.inlineData.data
);

}

}

}

}

});

window.gemini =
gemini;

liveBtn.onclick =
async()=>{

if(
gemini.isConnected()
){

mediaHandler.stopAudio();

gemini.disconnect();

return;

}

try{

status.textContent =
"Connecting...";

const res =
await fetch(
"/api/key"
);

const {
apiKey
} =
await res.json();

await mediaHandler
.initializeAudio();

await gemini
.connect(apiKey);

await mediaHandler
.startAudio(

(base64)=>{

if(
gemini.isConnected()
){

gemini.sendAudio(
base64
);

}

}

);

status.textContent =
"Listening";

}
catch(err){

console.log(err);

status.textContent =
err.message;

}

};

micBtn.onclick =
()=>{

if(
mediaHandler
.isRecording
){

mediaHandler
.stopAudio();

micBtn
.classList
.remove(
"listening"
);

}
else{

mediaHandler
.startAudio(

(base64)=>{

if(
gemini.isConnected()
){

gemini.sendAudio(
base64
);

}

}

);

micBtn
.classList
.add(
"listening"
);

}

};

form.onsubmit =
(e)=>{

e.preventDefault();

const text =
input.value.trim();

if(
!text ||
!gemini.isConnected()
){
return;
}

gemini.sendText(
text
);

addMessage(
"user",
text
);

input.value = "";

};
async function loadSessions(){

  try{

    const res =
    await fetch(
      "/api/sessions"
    );

    const sessions =
    await res.json();

    console.log(
      "SESSIONS:",
      sessions
    );

    sessionList.innerHTML = "";

    sessions.forEach(session=>{

      const button =
      document.createElement(
        "button"
      );

      button.className =
      "session-item";

      button.innerHTML = `
        <div class="session-title">
          ${
            session.lastMessage ||
            "New Chat"
          }
        </div>

        <div class="session-meta">
          ${session.turns} messages
        </div>
      `;

      button.onclick =
      ()=>{

        loadHistory(
          session.sessionId
        );

      };

      sessionList.appendChild(
        button
      );

    });

  }
  catch(err){

    console.log(
      "LOAD SESSION ERROR",
      err
    );

  }

}
async function loadHistory(id){

  try{

    const res =
    await fetch(
      `/api/history/${id}`
    );

    const history =
    await res.json();

    sessionId = id;

    transcript.innerHTML = "";

    history.forEach(item=>{

      if(item.userText){

        addMessage(
          "user",
          item.userText
        );

      }

      if(item.assistantText){

        addMessage(
          "assistant",
          item.assistantText
        );

      }

    });

  }
  catch(err){

    console.log(err);

  }

}
newChatButton.onclick =
()=>{

sessionId =
crypto.randomUUID();

localStorage.setItem(
"speechAssistantSessionId",
sessionId
);

transcript.innerHTML =
`

<div class="empty-state">
Start a new conversation
</div>
`;

};
console.log(
  "SESSION LIST:",
  sessionList
);
window.addEventListener(
"load",
()=>{
  loadSessions();
}
);