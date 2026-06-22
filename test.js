import { MongoClient } from "mongodb";

const uri =
"mongodb+srv://obedrajasingh:admin123@cluster0.daqvmzu.mongodb.net/speech_assistant?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri);

try {

 await client.connect();

 console.log("Connected!");

 await client.close();

}

catch(err){

 console.error(err);

}