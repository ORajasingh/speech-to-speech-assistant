export default class GeminiClient {

  constructor(config) {

    this.ws = null;

    this.onOpen = config.onOpen;

    this.onMessage = config.onMessage;

    this.onClose = config.onClose;

    this.onError = config.onError;

  }



  async connect(apiKey) {

    const url =
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;



    console.log("Connecting...", url);



    this.ws = new WebSocket(url);



    this.ws.binaryType = "blob";



    this.ws.onopen = () => {

      console.log("WS Connected");



const setup = {
  setup: {
    model:
    "models/gemini-2.5-flash-native-audio-preview-12-2025",

    generationConfig:{
      temperature:0.7
    },

    inputAudioTranscription:{},

    outputAudioTranscription:{}

  }
};

      console.log(setup);



      this.ws.send(

        JSON.stringify(

          setup

        )

      );



      if (

        this.onOpen

      ) {

        this.onOpen();

      }

    };





    this.ws.onmessage =

    async(event)=>{



      console.log(

        "TYPE:",

        typeof event.data

      );



      // Blob response

      if(

        event.data

        instanceof Blob

      ){



        console.log(

          event.data

        );



        try{



          const text=

          await event.data.text();



          console.log(

            "BLOB TEXT:",

            text

          );



          try{



            const json=

            JSON.parse(

              text

            );



            console.log(

              "JSON:",

              json

            );



            if(

              this.onMessage

            ){



              this.onMessage({

                data:

                JSON.stringify(

                  json

                )

              });



            }



          }

          catch(e){



            console.log(

              "Blob is not JSON"

            );



          }



        }

        catch(err){



          console.log(

            "Blob Read Error",

            err

          );



        }



      }



      // Text response

      else if(

        typeof event.data

        ===

        "string"

      ){



        console.log(

          event.data

        );



        if(

          this.onMessage

        ){



          this.onMessage(

            event

          );



        }



      }



    };





    this.ws.onerror=

    (error)=>{



      console.log(

        "WS ERROR",

        error

      );



      if(

        this.onError

      ){



        this.onError(

          error

        );



      }



    };





    this.ws.onclose=

    (event)=>{



      console.log(

        "WS CLOSED",

        event

      );



      console.log(

        "Code:",

        event.code

      );



      console.log(

        "Reason:",

        event.reason

      );



      if(

        this.onClose

      ){



        this.onClose(

          event

        );



      }



    };



  }





  send(data){



    if(

      this.ws

      &&

      this.ws.readyState===1

    ){



      this.ws.send(

        data

      );



    }



  }





  sendText(text){



    const payload={

      realtimeInput:{

        text:text

      }

    };



    console.log(

      payload

    );



    this.send(

      JSON.stringify(

        payload

      )

    );



  }





 sendAudio(base64){

const payload = {

  realtimeInput:{

    mediaChunks:[

      {

        mimeType:
        "audio/pcm;rate=16000",

        data:
        base64

      }

    ]

  }

};

this.send(
  JSON.stringify(payload)
);

}





  disconnect(){



    if(

      this.ws

    ){



      this.ws.close();



      this.ws=null;



    }



  }





  isConnected(){



    return(

      this.ws

      &&

      this.ws.readyState===1

    );



  }
sendEndOfTurn(){

this.send(

JSON.stringify({

realtimeInput:{

activityEnd:{}

}

})

);

console.log(

"END OF TURN"

);

}
}