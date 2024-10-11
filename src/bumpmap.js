export async function initializeBumpmap(device, myString) {
    const img = document.createElement('img');
    img.src = './'+myString+'/d512.bmp';
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
    
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',   // MIP 맵 필터링을 선형 보간으로 설정
    });
 
    return { texture, sampler };
}