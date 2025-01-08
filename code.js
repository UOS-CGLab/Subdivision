import { mat4 } from './src/mat4.js';
import { fpsAverage, jsAverage, gpuAverage } from './src/RollingAverage.js';
import { initializeWebGPU, fetchData } from './src/initializeWebGPU.js';
import { initializeScene } from './src/gui.js';
import { createBindGroup, changedBindGroup, extraBindGroup, createBindGroup_Limit } from './src/createBindGroups.js';
import { createPipelines } from './src/pipelines.js';
import { Camera, mouse_move, addkeyboardEvent} from './src/camera.js';

import { uniform_buffers, buffers} from './src/buffers.js';

const myString = "monsterfrog";
const depth = 6;

async function main() {
    let { canvas, device, context, presentationFormat, canTimestamp } = await initializeWebGPU();
    let { obj, Base_Vertex, animationBase, limit } = await fetchData(myString);
    const camera = new Camera();
    let keyValue = 1;
    canvas, keyValue = mouse_move(canvas, camera);
    addkeyboardEvent(camera)

    let { settings, lightPosition } = initializeScene(camera);

    let then = 0;
    let depthTexture;
    const infoElem = document.querySelector('#info');
    let gpuTime = 0;

    let narray = [1, 1, 1, 1, 1, 1, 1, 1];
    let pipelineValue = 1;

    let { uniformBuffer, uniformValues, matrixValue, viewValue, timeValue, wireValue, displacementValue, colorValue } = uniform_buffers(device);

    let { 
        levels,
        connectivityStorageBuffers,
        base_UVStorageBuffers,
        extra_base_UVStorageBuffers,
        extra_vertex_offsetStorageBuffers,
        textureBuffer,
        indices,
        texcoordDatas,
        indexBuffers,
        vertexBuffers,
        Base_Vertex_Buffer,
        Base_Normal_Buffer,
        OrdinaryPointData,
        textures,
        video,
        sampler,
        limit_Buffers,
        Base_Vertex_After_Buffer,
        OrdinaryBuffer
    } = await buffers(device, depth, obj, limit, myString);

    const { querySet, resolveBuffer, resultBuffer } = (() => {
        if (!canTimestamp) {
        return {};
        }

        const querySet = device.createQuerySet({
        type: 'timestamp',
        count: 2,
        });
        const resolveBuffer = device.createBuffer({
        size: querySet.count * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });
        const resultBuffer = device.createBuffer({
        size: resolveBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        return { querySet, resolveBuffer, resultBuffer };
    })();

    const renderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
        {
            // view: <- to be filled out when we render
            clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
        },
        ],
        depthStencilAttachment: {
            // view: <- 렌더링할 때 채워집니다.
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
        ...(canTimestamp && {
        timestampWrites: {
            querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        },
        }),
    };

    const renderPassDescriptor2 = {
        label: 'load canvas renderPass',
        colorAttachments: [
        {
            //view: swapChain.getCurrentTextureView(),
            clearValue: { r: 0.0, g: 1.0, b: 1.0, a: 1.0 },
            loadOp: 'load',
            storeOp: 'store',
        },
        ],
        depthStencilAttachment: {
            // view: <- 렌더링할 때 채워집니다.
            depthClearValue: 1.0,
            depthLoadOp: 'load',
            depthStoreOp: 'store',
        },
        ...(canTimestamp && {
        timestampWrites: {
            querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        },
        }),
    };

    const { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipeline_webCam, pipelines, pipeline2, pipelineAnime, pipeline_Limit } = await createPipelines(device, presentationFormat);
    
    const { fixedBindGroups, animeBindGroup, changedBindGroups } = await changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, Base_Normal_Buffer, textures, sampler, textureBuffer, connectivityStorageBuffers, base_UVStorageBuffers, pipelines, pipelineAnime, depth);
    
    let bindGroups = [];
    for (let i=0; i<=depth; i++){
        bindGroups.push(createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer, levels[i],i+1));
    }

    async function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        const startTime = performance.now();

        // const textureView = context.getCurrentTexture().createView();
        device.queue.copyExternalImageToTexture(
            { source: video },
            { texture: textures[2] },
            [video.videoWidth, video.videoHeight, 1],
        );
        
        // const commandEncoder = device.createCommandEncoder();
        // const passEncoder = commandEncoder.beginRenderPass({
        //     colorAttachments: [{
        //         view: textureView,
        //         loadOp: 'clear',
        //         clearValue: { r: 0, g: 0, b: 0, a: 1 },
        //         storeOp: 'store',
        //     }],
        // });
        // passEncoder.setPipeline(pipeline_webCam);
        // passEncoder.setBindGroup(0, bindGroup_webCam); // BindGroup 설정
        // passEncoder.draw(3);
        // passEncoder.end();
        // device.queue.submit([commandEncoder.finish()]);

        if(settings.getProterty('animation')[0]){
            Base_Vertex = new Float32Array(animationBase['Base_Vertex'+String(parseInt(  now*100%100  )).padStart(2, '0')]); // animation speed
        }

        device.queue.writeBuffer(Base_Vertex_Buffer, 0, Base_Vertex);

        const canvasTexture = context.getCurrentTexture();
        renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
        renderPassDescriptor2.colorAttachments[0].view = canvasTexture.createView();

        if (!depthTexture || depthTexture.width !== canvasTexture.width || depthTexture.height !== canvasTexture.height) {
            if (depthTexture) {
                depthTexture.destroy();
            }
            depthTexture = device.createTexture({
                size: [canvasTexture.width, canvasTexture.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });
        }
        
        renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();
        renderPassDescriptor2.depthStencilAttachment.view = depthTexture.createView();

        const matrix = mat4.create();
        mat4.multiply(matrix, camera.getViewMatrix(), camera.getProjectionMatrix());

        camera.update();
        mat4.multiply(camera.getProjectionMatrix(), camera.getViewMatrix(), matrixValue);

        keyValue = settings.getProterty('moveSpeed');
        if(lightPosition.getProterty('lightIsView') == true)
        {
            viewValue[0] = camera.position[0]; 
            lightPosition.setProterty('positionX', camera.position[0]);
            viewValue[1] = camera.position[1]; 
            lightPosition.setProterty('positionY', camera.position[1]);
            viewValue[2] = camera.position[2]; 
            lightPosition.setProterty('positionZ', camera.position[2]);
            viewValue[3] = 1;
        }
        else
        {
            viewValue[0] = lightPosition.getProterty('positionX'); viewValue[1] = lightPosition.getProterty('positionY'); 
            viewValue[2] = lightPosition.getProterty('positionZ'); viewValue[3] = 1;
        }
        timeValue[0] = now;
        wireValue[0] = settings.getProterty('wireAdjust');
        displacementValue[0] = settings.getProterty('displacementValue');
        switch(settings.getProterty('color'))
        {
            case 'position': { colorValue[0] = 0; break; }
            case 'normal': { colorValue[0] = 1; break; }
            case 'level': { colorValue[0] = 2; break; }
            case 'displacement_texture': { colorValue[0] = 4; break; }
            case 'webCam_texture': { colorValue[0] = 8; break; }
        }
        if(lightPosition.getProterty('lightActive') == true)
            colorValue[1] = 1;
        else colorValue[1] = 0;

        // upload the uniform values to the uniform buffer
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        if(settings.getProterty('animation')[1])
        {
            make_compute_encoder(device, pipelineAnime, animeBindGroup, 65535, "base_vertex_buffer animation encoder");
        }

        for(let i=0; i<=depth; i++) // 등호 확인
        {
            make_compute_encoder(device, pipeline_Face, bindGroups[i].bindGroup_Face, 65535, "face_compute_encoder");
            make_compute_encoder(device, pipeline_Edge, bindGroups[i].bindGroup_Edge, 65535, "edge_compute_encoder");
            make_compute_encoder(device, pipeline_Vertex, bindGroups[i].bindGroup_Vertex, 65535, "vertex_compute_encoder");
        }



        let encoder = device.createCommandEncoder({ label : 'Base_Vertex_After buffer encoder',});
        encoder.copyBufferToBuffer(Base_Vertex_Buffer, 0, Base_Vertex_After_Buffer, 0, Base_Vertex_Buffer.size);
        let commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        

        const zeroData = new Float32Array(Base_Vertex_Buffer.size/4).fill(0);
        await device.queue.writeBuffer(Base_Normal_Buffer, 0, zeroData);
        const bindGroup_Limit = await createBindGroup_Limit(device, pipeline_Limit, Base_Vertex_After_Buffer, Base_Normal_Buffer, limit_Buffers, settings);
        // Limit
        make_compute_encoder(device, pipeline_Limit, bindGroup_Limit, 65535, 'encoder for limit position');



        encoder = device.createCommandEncoder({ label : 'render pipeline encoder',});
        let pass = encoder.beginRenderPass(renderPassDescriptor);

        let tesselation = parseInt(settings.getProterty('tesselation'));
        for (let i=0; i<=depth; i++)
        {
            if(tesselation > depth)
                tesselation = depth;
            narray[i] = max(2**(tesselation-i),1);
        }

        let N = depth - tesselation;
        if(N <= 0) N = 0;
        for (let i = 0; i <= depth; i++) {
            device.queue.writeBuffer(vertexBuffers[N][i], 0, texcoordDatas[N][i]); // settings.onSliderChange('tesselation', tesselation);
            device.queue.writeBuffer(indexBuffers[N][i], 0, indices[N][i]);
        }
        switch (settings.getProterty('pipelineSetting'))
        {
            case 'V': pipelineValue = 0; break;
            case 'L': pipelineValue = 1; break;
            case 'F': pipelineValue = 2; break;
        }

        pass.setPipeline(pipelines[pipelineValue]);
        pass.setBindGroup(0, fixedBindGroups[pipelineValue]);
        for (let i = 0; i <= depth; i++) { // draw -> settings.getProterty('ordinaryLevel')
            pass.setBindGroup(1, changedBindGroups[i+(depth+1)*pipelineValue]);
            pass.setVertexBuffer(0, vertexBuffers[N][i]);
            pass.setIndexBuffer(indexBuffers[N][i], 'uint32');
            if(settings.getProterty('draw')[i] == true) {
                let j = i;
                if (i > 4); j = 4;
                // pass.drawIndexed(narray[i] * narray[i] * 6,  289);
                // patch1 120,              0.377045, 0.457611(위)    0.414398, 0.437653(아래) 0.400390625 
                //                          0.377044, 0.457611(위)로 가정.                     0.40039025
                //                                                                      오차: 0.000000395
                // patch2 528+289=817(818), 0.395721, 0.447632(위)    0.414398, 0.437653(아래) 0.40039025
                pass.drawIndexed(narray[i] * narray[i] * 6,  j * 2 * 1000 + 100000);
            }
        }
        pass.end();
        commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        // for(let i=0; i<=depth; i++)
        // {
        //     if(settings.getProterty('draw')[i] == true) {
        //         let j = i;
        //         if (i > 4); j = 4;
        //         let draw_size = (narray[i] * narray[i] * 6, j * 2 * 1000 + 100000);
        //     }
        //     make_render_encoder(device, renderPassDescriptor, pipelines[pipelineValue], changedBindGroups[i+(depth+1)*pipelineValue], vertexBuffers[N][i], indexBuffers[N][i], narray[i] * narray[i] * 6, 'render pipeline encoder');
        // }

        const OrdinaryPointfixedBindGroup = await extraBindGroup(device, uniformBuffer, OrdinaryPointData, Base_Vertex_After_Buffer, Base_Normal_Buffer, textures, sampler, extra_base_UVStorageBuffers, extra_vertex_offsetStorageBuffers, pipeline2, depth, settings)

        encoder = device.createCommandEncoder({ label : 'ordinary buffer encoder',});
        encoder.copyBufferToBuffer(Base_Vertex_Buffer, 0, OrdinaryBuffer, 0, Base_Vertex_Buffer.size);

        make_render_encoder(device, renderPassDescriptor2, pipeline2, OrdinaryPointfixedBindGroup, OrdinaryBuffer, false, 6*10000, 65535, 'ordinary draw encoder');

        if (canTimestamp) {
            encoder.resolveQuerySet(querySet, 0, querySet.count, resolveBuffer, 0);
            if (resultBuffer.mapState === 'unmapped') {
                encoder.copyBufferToBuffer(resolveBuffer, 0, resultBuffer, 0, resultBuffer.size);
            }
        }

        commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        // await device.queue.onSubmittedWorkDone();

        if (canTimestamp && resultBuffer.mapState === 'unmapped') {
        resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
            const times = new BigInt64Array(resultBuffer.getMappedRange());
            gpuTime = Number(times[1] - times[0]);
            gpuAverage.addSample(gpuTime / 1000);
            resultBuffer.unmap();
        });
        }

        const jsTime = performance.now() - startTime;

        fpsAverage.addSample(1 / deltaTime);
        jsAverage.addSample(jsTime);

        infoElem.textContent = `\
            fps: ${fpsAverage.get().toFixed(1)}
            js: ${jsAverage.get().toFixed(1)}ms
            gpu: ${canTimestamp ? `${gpuAverage.get().toFixed(1)}µs` : 'N/A'}
            `;
        
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target;
            const aspectRatio = 1;  // 고정된 비율 (예: 16:9) // 16 / 9
    
            let width, height;
    
            if (entry.contentBoxSize) {
                if (Array.isArray(entry.contentBoxSize)) {
                    width = entry.contentBoxSize[0].inlineSize;
                    height = entry.contentBoxSize[0].blockSize;
                } else {
                    width = entry.contentBoxSize.inlineSize;
                    height = entry.contentBoxSize.blockSize;
                }
            } else {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
            }
    
            // 비율을 유지하며 너비와 높이를 설정
            if (width / height > aspectRatio) {
                width = height * aspectRatio;
            } else {
                height = width / aspectRatio;
            }
    
            // 캔버스 크기를 비율에 맞게 조정
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.style.position = 'absolute';
            canvas.style.left = `${width / 2}px`;
            // canvas.style.width = '1080px';
            // canvas.style.height = '1080px';
    
            // 캔버스의 실제 렌더링 크기를 설정
            canvas.width = Math.max(1, Math.min(Math.round(width), device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(Math.round(height), device.limits.maxTextureDimension2D));
        }
    });
    observer.observe(canvas);
    
}

function max(a, b) {
    return a > b ? a : b;
}

function make_compute_encoder(device, pipeline, bindgroup, workgroupsize, text = " ") {
    const encoder = device.createCommandEncoder({label: text});
    const pass = encoder.beginComputePass({label: text});
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindgroup);
    pass.dispatchWorkgroups(workgroupsize);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

function make_render_encoder(device, renderPassDescriptor, pipeline, bindgroup, vertexBuffer, indexBuffer = false, draw_size, text = " ") {
    const encoder = device.createCommandEncoder({label: text});
    const pass = encoder.beginRenderPass(renderPassDescriptor, {label: text});
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindgroup);
    pass.setVertexBuffer(0, vertexBuffer);
    if(indexBuffer){
        pass.setIndexBuffer(indexBuffer, 'uint32');
        pass.drawIndexed(draw_size);// parameter가 2개여야 한다.
    }
    else {
        pass.draw(draw_size);
    }
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}



main();
