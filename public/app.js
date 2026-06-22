const transcript = document.querySelector("#transcript");

const statusEl = document.querySelector("#status");

const form = document.querySelector("#chat-form");

const input = document.querySelector("#message-input");

const micButton = document.querySelector("#mic-button");

const liveButton = document.querySelector("#live-button");

const sessionList =
document.querySelector("#session-list");

const newChatButton =
document.querySelector("#new-chat-button");



const SpeechRecognition =

window.SpeechRecognition ||

window.webkitSpeechRecognition;



const recognition =

SpeechRecognition

? new SpeechRecognition()

: null;



let sessionId=

localStorage.getItem(

"speechAssistantSessionId"

)

||

crypto.randomUUID();



localStorage.setItem(

"speechAssistantSessionId",

sessionId

);



let selectedSessionId=

sessionId;



let listening=false;

let liveMode=false;

let sending=false;



let availableVoices=[];

let detectedLanguage="en-US";



function setStatus(text){

statusEl.textContent=text;

}



function clearTranscript(){

transcript.innerHTML="";

}



function setEmptyState(){

if(transcript.children.length)

return;



const div=

document.createElement(

"div"

);



div.className=

"empty-state";



div.innerHTML=

`

Press

<b>

Start Live

</b>

and speak.

<br><br>

Tamil, English

and mixed languages

supported.

`;



transcript.appendChild(

div

);

}



function clearEmptyState(){

transcript

.querySelector(

".empty-state"

)

?.remove();

}




function addMessage(

role,

text

){

clearEmptyState();



const div=

document.createElement(

"div"

);



div.className=

`message ${role}`;



div.textContent=text;



transcript.appendChild(

div

);



transcript.scrollTop=

transcript.scrollHeight;



return div;

}



function updateMessage(

bubble,

text

){

bubble.textContent=text;



transcript.scrollTop=

transcript.scrollHeight;

}




function getSpeechLanguage(

text,

lang

){

if(

lang

&&

lang!=="auto"

){

return lang;

}



if(

/[\u0B80-\u0BFF]/

.test(text)

){

return "ta-IN";

}



if(

/[\u0900-\u097F]/

.test(text)

){

return "hi-IN";

}



if(

/[\u0C00-\u0C7F]/

.test(text)

){

return "te-IN";

}



if(

/[\u0D00-\u0D7F]/

.test(text)

){

return "ml-IN";

}



return "en-US";

}




function loadVoices(){

availableVoices=

speechSynthesis

.getVoices();

}



window.speechSynthesis

.addEventListener(

"voiceschanged",

loadVoices

);



loadVoices();





function getMatchingVoice(

lang

){

const base=

lang

.split("-")[0];



return (

availableVoices.find(

v=>

v.lang===lang

)

||

availableVoices.find(

v=>

v.lang

?.startsWith(

base

)

)

||

null

);

}





function speak(

text,

lang

){

return new Promise(

resolve=>{



speechSynthesis

.cancel();



const u=

new SpeechSynthesisUtterance(

text

);



const speakLang=

getSpeechLanguage(

text,

lang

);



u.lang=speakLang;



u.rate=1;

u.pitch=1;



const voice=

getMatchingVoice(

speakLang

);



if(voice){

u.voice=voice;

}



u.onend=()=>{

resolve();

};



u.onerror=()=>{

resolve();

};



speechSynthesis

.speak(u);



}

);

}




async function

refreshSessions(){



const res=

await fetch(

"/api/sessions",

{

cache:

"no-store"

}

);



if(

!res.ok

)

return;



const sessions=

await res.json();



sessionList.innerHTML="";



if(

!sessions.length

){

sessionList.innerHTML=

`

<div class="session-meta">

No conversations

</div>

`;



return;

}



for(

const s

of sessions

){



const btn=

document.createElement(

"button"

);



btn.type="button";



btn.className=

`session-item

${

s.sessionId===

selectedSessionId

?

"active"

:

""

}`;



btn.dataset.sessionId=

s.sessionId;



btn.innerHTML=

`

<div class="session-title">

${

s.lastMessage

||

"New Chat"

}

</div>


<div class="session-meta">

${s.turns}

turns

</div>

`;



sessionList.appendChild(

btn

);



}

}




async function

loadHistory(

id=sessionId

){

selectedSessionId=id;



clearTranscript();



const res=

await fetch(

`/api/history/${id}`,

{

cache:

"no-store"

}

);



if(

!res.ok

){

setEmptyState();

return;

}



const data=

await res.json();



if(

!data.length

){

setEmptyState();

return;

}



for(

const msg

of data

){

addMessage(

"user",

msg.userText

);



addMessage(

"assistant",

msg.assistantText

);

}

}
async function sendMessage(message){

const cleanMessage=

message.trim();

if(

!cleanMessage

||

sending

){

return;

}


sending=true;

addMessage(

"user",

cleanMessage

);


const pending=

addMessage(

"assistant",

"Thinking..."

);


input.value="";

setStatus("Thinking");


try{

const response=

await fetch(

"/api/chat",

{

method:"POST",

headers:{

"Content-Type":

"application/json"

},

body:

JSON.stringify({

sessionId,

message:cleanMessage

})

}

);


const data=

await response.json();


updateMessage(

pending,

data.assistantText

);


detectedLanguage=

data.language

||

"en-US";


await refreshSessions();


setStatus(

"Speaking"

);


await speak(

data.assistantText,

detectedLanguage

);


setStatus(

liveMode

?

"Listening"

:

"Ready"

);

}

catch(err){

console.log(err);

updateMessage(

pending,

"Something went wrong."

);

setStatus(

"Error"

);

}

finally{

sending=false;


if(

liveMode

){

startListening();

}

}

}





async function

sendVoice(

audioBase64,

mimeType

){

if(

sending

)

return;


sending=true;


const userBubble=

addMessage(

"user",

"Transcribing..."

);


const aiBubble=

addMessage(

"assistant",

"Thinking..."

);


setStatus(

"Thinking"

);


try{


const response=

await fetch(

"/api/voice",

{

method:"POST",

headers:{

"Content-Type":

"application/json"

},

body:

JSON.stringify({

sessionId,

audioBase64,

mimeType

})

}

);



const data=

await response.json();



updateMessage(

userBubble,

data.transcript

);



updateMessage(

aiBubble,

data.assistantText

);



detectedLanguage=

data.language

||

"en-US";



await refreshSessions();



setStatus(

"Speaking"

);



await speak(

data.assistantText,

detectedLanguage

);



setStatus(

liveMode

?

"Listening"

:

"Ready"

);


}

catch(err){

console.log(err);


updateMessage(

aiBubble,

"Voice failed"

);


setStatus(

"Error"

);

}

finally{


sending=false;


if(

liveMode

){

setTimeout(()=>{

if(liveMode){

startListening();

}

},1000);

}

}

}


async function recordAudio() {

  const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true
    });

  return new Promise((resolve, reject) => {

    const recorder =
      new MediaRecorder(stream);

    const chunks = [];

    recorder.ondataavailable = (e) => {

      if (e.data.size > 0) {

        chunks.push(e.data);

      }

    };

    recorder.onerror = (e) => {

      console.log(e);

      stream.getTracks().forEach(
        t => t.stop()
      );

      reject(e);

    };

    recorder.onstop = () => {

      const blob = new Blob(
        chunks,
        {
          type: "audio/webm"
        }
      );

      const reader =
        new FileReader();

      reader.onloadend = () => {

        const base64 =
          reader.result
            .split(",")[1];

        stream
          .getTracks()
          .forEach(
            t => t.stop()
          );

        resolve({

          audioBase64: base64,

          mimeType: "audio/webm"

        });

      };

      reader.readAsDataURL(blob);

    };

    recorder.start();

    setStatus("Listening");

    // Record for 5 seconds

    setTimeout(() => {

      if (

        recorder.state ===

        "recording"

      ) {

        recorder.stop();

      }

    }, 5000);

  });

}



async function handleVoice() {

  try {

    const audio =
      await recordAudio();

    if (!audio) {

      return;

    }

    await sendVoice(

      audio.audioBase64,

      audio.mimeType

    );

  }

  catch (err) {

    console.log(err);

    setStatus("Mic Error");

  }

}


function startListening() {

  if (

    sending ||

    listening

  ) {

    return;

  }

  listening = true;

  micButton
    .classList
    .add(
      "listening"
    );

  handleVoice()

    .finally(() => {

      listening = false;

      micButton
        .classList
        .remove(
          "listening"
        );

      if (

        liveMode

      ) {

        setTimeout(() => {

          startListening();

        }, 700);

      }

    });

}



function stopListening(){

listening=false;

micButton
.classList
.remove(
"listening"
);

setStatus(
"Ready"
);

}




micButton

.addEventListener(

"click",

()=>{


liveMode=false;



stopListening();



startListening();


}

);





liveButton

.addEventListener(

"click",

()=>{


liveMode=

!liveMode;



liveButton

.classList

.toggle(

"active",

liveMode

);



liveButton

.textContent=

liveMode

?

"Stop Live"

:

"Start Live";



if(

liveMode

){

startListening();

}

else{

stopListening();

}


}

);





newChatButton

.addEventListener(

"click",

async()=>{


liveMode=false;



stopListening();



speechSynthesis

.cancel();



sessionId=

crypto.randomUUID();



selectedSessionId=

sessionId;



localStorage

.setItem(

"speechAssistantSessionId",

sessionId

);



clearTranscript();



setEmptyState();



await refreshSessions();



setStatus(

"Ready"

);


}

);





sessionList

.addEventListener(

"click",

async e=>{


const item=

e.target

.closest(

".session-item"

);



if(

!item

)

return;



liveMode=false;



stopListening();



sessionId=

item.dataset.sessionId;



selectedSessionId=

sessionId;



localStorage

.setItem(

"speechAssistantSessionId",

sessionId

);



await loadHistory(

sessionId

);



await refreshSessions();



setStatus(

"Ready"

);


}

);





form

.addEventListener(

"submit",

e=>{


e.preventDefault();



sendMessage(

input.value

);


}

);





loadHistory();

refreshSessions();

setStatus(

"Ready"

);