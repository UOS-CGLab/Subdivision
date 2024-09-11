export async function initializeWebGPU() {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) {
        throw new Error('Failed to get GPU adapter. Your browser might not support WebGPU.');
    }

    const canTimestamp = adapter.features.has('timestamp-query');
    const device = await adapter.requestDevice({
        requiredFeatures: [
            ...(canTimestamp ? ['timestamp-query'] : []),
        ],
    });

    if (!device) {
        throw new Error('Failed to get GPU device. Your browser might not support WebGPU.');
    }

    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'premultiplied',
    });

    return { canvas, device, context, presentationFormat, canTimestamp };
}

export async function fetchData(myString) {
    const data = await fetch('./Subdivision/'+myString+'/topology.json');
    const data2 = await fetch('./Subdivision/'+myString+'/base.json');
    const obj = await data.json();
    const base = await data2.json();

    const animationBase = await (await fetch('./src/'+myString+'/animation/base.json')).json();

    return { obj, base, animationBase };
}

