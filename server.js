import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

const {
  GEMINI_API_KEY,
  MONGODB_URI,
  MONGODB_DB = "speech_assistant",
  PORT = 3000
} = process.env;

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY");
}

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

const app = express();

app.use(cors());

app.use(express.json({
  limit: "25mb"
}));

app.use(express.static("public"));



const mongo = new MongoClient(
  MONGODB_URI,
  {
    tls: true,
    serverSelectionTimeoutMS: 30000,
    family: 4
  }
);

let conversations;



async function connectMongo() {

  await mongo.connect();

  const db = mongo.db(MONGODB_DB);

  conversations =
    db.collection("conversations");

  await conversations.createIndex({

    sessionId: 1,

    createdAt: -1

  });

  console.log("MongoDB Connected");

}



app.get("/", (req, res) => {

  res.sendFile(

    process.cwd() +

    "/public/index.html"

  );

});



app.get("/api/key", (req, res) => {

  res.json({

    apiKey:

      GEMINI_API_KEY

  });

});



app.post("/api/save", async (req, res) => {

  try {

    const {

      sessionId,

      userText,

      assistantText,

      language,

      languageName

    } = req.body;



    const now = new Date();



    await conversations.insertOne({

      sessionId,

      userText,

      assistantText,

      language,

      languageName,

      model:

        "gemini-3.1-flash-live-preview",

      createdAt: now

    });



    res.json({

      success: true,

      createdAt: now

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      error: err.message

    });

  }

});



app.get("/api/history/:sessionId",

async (req,res)=>{

try{

const turns=

await conversations

.find({

sessionId:

req.params.sessionId

})

.sort({

createdAt:1

})

.limit(100)

.toArray();



res.json(

turns.map(

({

_id,

...x

})=>({

id:

_id.toString(),

...x

})

)

);

}

catch(err){

console.log(err);

res.status(500).json({

error:

err.message

});

}

});



app.get(

"/api/sessions",

async(req,res)=>{

try{

const sessions=

await conversations

.aggregate([

{

$sort:{

createdAt:-1

}

},

{

$group:{

_id:

"$sessionId",

lastMessage:{

$first:

"$userText"

},

updatedAt:{

$first:

"$createdAt"

},

turns:{

$sum:1

}

}

},

{

$sort:{

updatedAt:-1

}

},

{

$limit:30

}

])

.toArray();



res.json(

sessions.map(

s=>({

sessionId:

s._id,

lastMessage:

s.lastMessage,

updatedAt:

s.updatedAt,

turns:

s.turns

})

)

);

}

catch(err){

console.log(err);

res.status(500).json({

error:

err.message

});

}

}

);



async function start(){

await connectMongo();



app.listen(

PORT,

()=>{

console.log(

`Server:

http://localhost:${PORT}`

);

}

);

}



start();