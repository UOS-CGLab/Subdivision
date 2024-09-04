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
    device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture },
        [imageBitmap.width, imageBitmap.height, 1]
    );
    const textureView = texture.createView();

    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',   // MIP 맵 필터링을 선형 보간으로 설정
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
 
    return { displacementBuffer, texture, sampler };
}