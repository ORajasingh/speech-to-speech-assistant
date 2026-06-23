class PCMProcessor extends AudioWorkletProcessor {

  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = [];
  }

  process(inputs) {

    const input = inputs[0];

    if (!input || !input[0]) {
      return true;
    }

    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {

      let sample = Math.max(
        -1,
        Math.min(
          1,
          channel[i]
        )
      );

      const pcm16 =
        sample < 0
          ? sample * 32768
          : sample * 32767;

      this.buffer.push(
        Math.round(pcm16)
      );
    }

    if (this.buffer.length >= this.bufferSize) {

      const pcmBuffer =
        new Int16Array(this.buffer);

      this.port.postMessage(
        pcmBuffer.buffer
      );

      this.buffer = [];
    }

    return true;
  }
}

registerProcessor(
  "pcm-processor",
  PCMProcessor
);