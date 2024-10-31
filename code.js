import { mat4 } from './src/mat4.js';
import { fpsAverage, jsAverage, gpuAverage } from './src/RollingAverage.js';
import { initializeWebGPU, fetchData } from './src/initializeWebGPU.js';
import { initializeScene } from './src/gui.js';
import { createBindGroup_PatchTexture, createBindGroup, changedBindGroup, extraBindGroup, createBindGroup_Limit } from './src/createBindGroups.js';
import { createPipelines } from './src/pipelines.js';
import { Camera, mouse_move} from './src/camera.js';

import { uniform_buffers, buffers} from './src/buffers.js';

const myString = "monsterfrog";
const depth = 4;

async function main() {
    let { canvas, device, context, presentationFormat, canTimestamp } = await initializeWebGPU();
    const { obj, base, animationBase, limit } = await fetchData(myString);
    const camera = new Camera();
    let keyValue = 1;
    canvas, keyValue = mouse_move(canvas, camera);

    let { uniformBuffer, uniformValues, matrixValue, viewValue, timeValue, wrieValue} = uniform_buffers(device);

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
        texture,
        sampler,
        limit_Buffers,
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

    let Base_Vertex = new Float32Array(base.Base_Vertex);
    let settings = initializeScene();

    let then = 0;
    let depthTexture;
    const infoElem = document.querySelector('#info');
    let gpuTime = 0;

    let narray = [1, 1, 1, 1, 1, 1, 1, 1];

    let pipelineValue = 1;
    let ordinaryValue = 1;

    const { pipeline_Face, pipeline_Edge, pipeline_Vertex, 
            pipelines, pipeline2, pipelineAnime, pipeline_Limit } = await createPipelines(device, presentationFormat);

    const { fixedBindGroups, animeBindGroup, changedBindGroups }
    = await changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, Base_Normal_Buffer, texture, sampler, textureBuffer,
        connectivityStorageBuffers, base_UVStorageBuffers, pipelines, pipelineAnime, depth);
    
    let bindGroups = [];
    for (let i=0; i<=depth; i++)
    {
        bindGroups.push(createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer, levels[i],i+1));
    }

    const OrdinaryPointfixedBindGroup = await extraBindGroup(device, uniformBuffer, OrdinaryPointData, Base_Vertex_Buffer, Base_Normal_Buffer, texture, sampler, 
        extra_base_UVStorageBuffers, extra_vertex_offsetStorageBuffers, pipeline2, depth, settings)

    const bindGroup_Limit = await createBindGroup_Limit(device, pipeline_Limit, Base_Vertex_Buffer, Base_Normal_Buffer, limit_Buffers, settings);
    
    let computePassData = [];
    for (let i=0; i<=depth; i++)
    {
        computePassData.push({prefix: '_'+(i),
            bindGroup_Face: bindGroups[i].bindGroup_Face,
            bindGroup_Edge: bindGroups[i].bindGroup_Edge,
            bindGroup_Vertex: bindGroups[i].bindGroup_Vertex});
    }

    async function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        const startTime = performance.now();

        if(settings.getProterty('animation')){
            Base_Vertex = new Float32Array(animationBase['Base_Vertex'+String(parseInt(  now%100  )).padStart(2, '0')]); // animation speed
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
        viewValue[0] = 0; viewValue[1] = 0; viewValue[2] = -50; viewValue[3] = 1;
        timeValue[0] = now;
        wrieValue[0] = settings.getProterty('wireAdjust');

        // upload the uniform values to the uniform buffer
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        let encoder = device.createCommandEncoder({label : 'base_vertex_buffer animation encoder',});
        let pass = encoder.beginComputePass();
        pass.setPipeline(pipelineAnime);
        pass.setBindGroup(0, animeBindGroup);
        pass.dispatchWorkgroups(65535);
        pass.end();

        encoder = device.createCommandEncoder({ label : 'base_vertex_buffer update encoder',});

        for (const data of computePassData) {
            const prefix = data.prefix;
            const bindGroup_Face = data.bindGroup_Face;
            const bindGroup_Edge = data.bindGroup_Edge;
            const bindGroup_Vertex = data.bindGroup_Vertex;

            const pass_Face = encoder.beginComputePass();
            pass_Face.setPipeline(pipeline_Face);
            pass_Face.setBindGroup(0, bindGroup_Face);
            pass_Face.dispatchWorkgroups(65535);
            pass_Face.end();

            const pass_Edge = encoder.beginComputePass();
            pass_Edge.setPipeline(pipeline_Edge);
            pass_Edge.setBindGroup(0, bindGroup_Edge);
            pass_Edge.dispatchWorkgroups(65535);
            pass_Edge.end();

            const pass_Vertex = encoder.beginComputePass();
            pass_Vertex.setPipeline(pipeline_Vertex);
            pass_Vertex.setBindGroup(0, bindGroup_Vertex);
            pass_Vertex.dispatchWorkgroups(65535);
            pass_Vertex.end();
        }
        let commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);


        encoder = device.createCommandEncoder({ label : 'render pipeline encoder',});
        pass = encoder.beginRenderPass(renderPassDescriptor);

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
            device.queue.writeBuffer(vertexBuffers[N][i], 0, texcoordDatas[N][i]);
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
                pass.drawIndexed(narray[i] * narray[i] * 6,  j * 2 * 1000 + 100000);
            }
        }
        pass.end();
        commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        // Limit

        const encoder2 = device.createCommandEncoder({ label : 'encoder for limit position',});
        const pass2 = encoder2.beginComputePass({label : 'computepass'});
        pass2.setPipeline(pipeline_Limit);
        pass2.setBindGroup(0, bindGroup_Limit);
        pass2.dispatchWorkgroups(65535);
        pass2.end();
        const commandBuffer2 = encoder2.finish();
        device.queue.submit([commandBuffer2]);

        // 커맨드 엔코더 생성
        encoder = device.createCommandEncoder({ label : 'ordinary buffer encoder',});
        // 데이터 복사를 위한 커맨드 추가
        encoder.copyBufferToBuffer(
            Base_Vertex_Buffer, // 소스 버퍼
            0, // 소스 오프셋
            OrdinaryBuffer, // 대상 버퍼
            0, // 대상 오프셋
            Base_Vertex_Buffer.size // 복사할 데이터 크기
        );
        // 커맨드 제출draw
        commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);



        encoder = device.createCommandEncoder({ label : 'ordinary draw encoder',});
        pass = encoder.beginRenderPass(renderPassDescriptor2);

        ordinaryValue = settings.getProterty('ordinaryLevel');
        if(ordinaryValue > depth) ordinaryValue = depth
        pass.setPipeline(pipeline2);
        pass.setBindGroup(0, OrdinaryPointfixedBindGroup);
        pass.setVertexBuffer(0, OrdinaryBuffer);
        pass.draw(6*10000);
        pass.end();

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
            const aspectRatio = 16 / 9;  // 고정된 비율 (예: 16:9)
    
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

main();