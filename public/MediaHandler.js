export default class MediaHandler {

  constructor() {

    this.audioContext = null;
    this.playbackContext = null;

    this.stream = null;
    this.source = null;
    this.worklet = null;

    this.isRecording = false;

    this.nextPlayTime = 0;

  }

  async initializeAudio() {

    if (!this.audioContext) {

      this.audioContext =
        new AudioContext({
          sampleRate: 16000
        });

      await this.audioContext.audioWorklet.addModule(
        "pcm-processor.js"
      );

    }

    if (!this.playbackContext) {

      this.playbackContext =
        new AudioContext({
          sampleRate: 24000
        });

      await this.playbackContext.resume();

    }

    console.log(
      "Audio Initialized"
    );

  }

  async startAudio(callback) {

    if (this.isRecording) {
      return;
    }

    this.stream =
      await navigator.mediaDevices.getUserMedia({

        audio: {

          channelCount: 1,

          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true

        }

      });

    this.source =
      this.audioContext.createMediaStreamSource(
        this.stream
      );

    this.worklet =
      new AudioWorkletNode(
        this.audioContext,
        "pcm-processor"
      );

    this.source.connect(
      this.worklet
    );

    this.worklet.port.onmessage =
      (event) => {

        const pcm16 =
          new Int16Array(
            event.data
          );

        console.log(
          "Mic PCM",
          pcm16.length
        );

        const bytes =
          new Uint8Array(
            pcm16.buffer
          );

        let binary = "";

        for (
          let i = 0;
          i < bytes.length;
          i++
        ) {

          binary +=
            String.fromCharCode(
              bytes[i]
            );

        }

        const base64 =
          btoa(binary);

        callback(base64);

      };

    this.isRecording = true;

    console.log(
      "Microphone Started"
    );

  }

  stopAudio() {

    this.isRecording = false;

    if (this.worklet) {

      this.worklet.disconnect();
      this.worklet = null;

    }

    if (this.source) {

      this.source.disconnect();
      this.source = null;

    }

    if (this.stream) {

      this.stream
        .getTracks()
        .forEach(
          track => track.stop()
        );

      this.stream = null;

    }

    if (
      window.gemini &&
      window.gemini.isConnected()
    ) {

      window.gemini.sendEndOfTurn();

    }

    console.log(
      "Microphone Stopped"
    );

  }

  playAudio(base64) {

    try {

      if (
        !base64 ||
        base64.length < 10
      ) {
        return;
      }

      const binary =
        atob(base64);

      const bytes =
        new Uint8Array(
          binary.length
        );

      for (
        let i = 0;
        i < binary.length;
        i++
      ) {

        bytes[i] =
          binary.charCodeAt(i);

      }

      const pcm16 =
        new Int16Array(
          bytes.buffer
        );

      const float32 =
        new Float32Array(
          pcm16.length
        );

      for (
        let i = 0;
        i < pcm16.length;
        i++
      ) {

        float32[i] =
          pcm16[i] / 32768;

      }

      const buffer =
        this.playbackContext.createBuffer(
          1,
          float32.length,
          24000
        );

      buffer
        .getChannelData(0)
        .set(float32);

      const source =
        this.playbackContext
          .createBufferSource();

      source.buffer =
        buffer;

      source.connect(
        this.playbackContext.destination
      );

      const now =
        this.playbackContext.currentTime;

      if (
        this.nextPlayTime < now
      ) {

        this.nextPlayTime = now;

      }

      source.start(
        this.nextPlayTime
      );

      this.nextPlayTime +=
        buffer.duration;

      console.log(
        "PLAY AUDIO",
        buffer.duration
      );

    }

    catch (err) {

      console.log(
        "Play Audio Error",
        err
      );

    }

  }

}