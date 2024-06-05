export class RollingAverage {
    #total = 0;
    #samples = [];
    #cursor = 0;
    #numSamples;
    constructor(numSamples = 30) {
        this.#numSamples = numSamples;
    }
    addSample(v) {
        this.#total += v - (this.#samples[this.#cursor] || 0);
        this.#samples[this.#cursor] = v;
        this.#cursor = (this.#cursor + 1) % this.#numSamples;
    }
    get() {
        return this.#total / this.#samples.length;
    }
}

export const fpsAverage = new RollingAverage();
export const jsAverage = new RollingAverage();
export const gpuAverage = new RollingAverage();