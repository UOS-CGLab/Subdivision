import { handleKeyUp, handleKeyDown } from './camera.js';

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

    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleKeyDown);

    return { canvas, device, context, presentationFormat, canTimestamp };
}

export async function fetchData(myString) {
    const data = await fetch('./' + myString + '/topology.json');
    const data2 = await fetch('./' + myString + '/base.json');
    const data3 = await fetch('./' + myString + '/limit_point.json');
    const obj = await data.json();
    const base =await data2.json();
    const limit = await data3.json();

    console.log(limit);

    const animationBase = await (await fetch('./../'+myString+'/animation/base.json')).json();

    const img = document.createElement('img');
    img.src = './'+myString+'/d512.bmp';
    await img.decode();

    let Base_Vertex =  new Float32Array(base.Base_Vertex);

    return { obj, Base_Vertex, animationBase, limit };
}

