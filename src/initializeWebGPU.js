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
    const data = await fetch('./../'+myString+'/topology.json');
    const data2 = await fetch('./../'+myString+'/base.json');
    const obj = await data.json();
    const base = await data2.json();

    // fetch('./../'+myString+'/base')
    //     .then(response => response.json())
    //     .then(files => {
    //         const list = document.getElementById('fileList');
    //         list.innerHTML = ''; // 기존 목록을 비웁니다.
    //         files.forEach(file => {
    //             const listItem = document.createElement('li');
    //             listItem.textContent = file;
    //             list.appendChild(listItem);
    //         });
    //     })
    //     .catch(error => console.error('Error fetching files:', error));

    const animationBase = await (await fetch('./../'+myString+'/animation/base.json')).json();
    // for(let i=0; i<=99; i++)
    // {
    //     animationBase.push(await (await fetch('./../'+myString+'/animation/base'+String(i).padStart(2, '0')+'.json')).json());
    // }
    console.log(animationBase);

    return { obj, base, animationBase };
}

