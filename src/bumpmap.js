export async function initializeBumpmap(device, myString) {
    const img = document.createElement('img');
    img.src = './'+myString+'/d.bmp';
    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const textureView = texture.createView();
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
    });

    const module = device.createShaderModule({ 
        code: `
            @group(0) @binding(0) var srcTexture: texture_2d<f32>;
            @group(0) @binding(1) var<storage, read_write> dstBuffer: array<f32>;

            @compute @workgroup_size(1)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let x = i32(global_id.x);
                let y = i32(global_id.y);
                let pixel = textureLoad(srcTexture, vec2<i32>(x, y), 0);
                let index = x + y * i32(textureDimensions(srcTexture, 0).x);
                dstBuffer[index] = pixel.r;  // 예를 들어, R 채널만 저장
            }
        `
    });
    const computePipeline = device.createComputePipeline({
        label: 'test Compute Pipeline',
        layout: 'auto',
        compute: {
            module: module,
            entryPoint: 'main'
        }
    });

    const canvas2 = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const context2 = canvas2.getContext('2d');
    context2.drawImage(img, 0, 0);
    const imageData = context2.getImageData(0, 0, canvas2.width, canvas2.height);
    const floatData = new Float32Array(imageData.data.length);
    for (let i = 0; i < imageData.data.length; i++) {
        floatData[i] = imageData.data[i] / 255.0;  // 0.0 ~ 1.0 사이의 값으로 정규화
    }
    let displacementBuffer = device.createBuffer({
        size: floatData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Float32Array(displacementBuffer.getMappedRange()).set(floatData);
    displacementBuffer.unmap();
    const dstBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: textureView },
            { binding: 1, resource: { buffer: displacementBuffer } }
        ]
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, dstBindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(imageBitmap.width / 64), Math.ceil(imageBitmap.height / 64));
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    // async function readBuffer(device, buffer, bufferSize) {
    //     // 읽기 버퍼 생성
    //     const readBuffer = device.createBuffer({
    //         size: bufferSize,
    //         usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    //     });

    //     // 커맨드 인코더 생성 및 복사 명령 추가
    //     const commandEncoder = device.createCommandEncoder();
    //     commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, bufferSize);

    //     // 커맨드 버퍼 제출 및 완료 기다림
    //     const commandBuffer = commandEncoder.finish();
    //     device.queue.submit([commandBuffer]);
    //     await new Promise(resolve => setTimeout(resolve, 100));
    //     await readBuffer.mapAsync(GPUMapMode.READ);
    //     // 버퍼에서 데이터 읽기
    //     const arrayBuffer = readBuffer.getMappedRange();
    //     console.log(new Float32Array(arrayBuffer));  // 데이터를 Float32Array로 로깅
    //     // 리소스 정리
    //     readBuffer.unmap();
    // }

    // 함수 호출 예시 (버퍼 크기와 device를 정의해야 함)
    // readBuffer(device, displacementBuffer, displacementBuffer.size);
 
    return { displacementBuffer, texture, sampler };
}