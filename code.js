import { mat4 } from './src/mat4.js';
import { fpsAverage, jsAverage, gpuAverage } from './src/RollingAverage.js';
import { createFVertices } from './src/createFVertices.js';
import { initializeWebGPU, fetchData } from './src/initializeWebGPU.js';
import { initializeScene } from './src/gui.js';
import { createBufferData, createBindGroup, changedBindGroup } from './src/createBindGroups.js';
import { createPipelines } from './src/pipelines.js';
import { createBuffers } from './src/makeBuffer.js';
import { Camera } from './src/camera.js';
import { initializeBumpmap } from './src/bumpmap.js';

// const myString = "chest";
// const myString = "grass_block2"
const myString = "monsterfrog";
const depth = 4;

async function main() {
    const { canvas, device, context, presentationFormat, canTimestamp } = await initializeWebGPU();
    const { obj, base, animationBase } = await fetchData(myString);
    const camera = new Camera();



    /*for limit*/
    const data3 = await fetch('./'+myString+'/limit_point.json');
    const limit = await data3.json();

    const { displacementBuffer, texture, sampler } = await initializeBumpmap(device, myString);

    const uniformBufferSize = (24) * 4;
    const uniformBuffer = device.createBuffer({
        label: 'uniforms',
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    const kMatrixOffset = 0;
    const viewOffset = 16;
    const timeOffset = 20;
    const wireOffset = 24;

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
    const viewValue = uniformValues.subarray(viewOffset, viewOffset + 4);
    const timeValue = uniformValues.subarray(timeOffset, timeOffset + 4);
    const wrieValue = uniformValues.subarray(timeOffset, timeOffset + 4);

    let lastX;
    let lastY;
    let angle = [0,0];
    let dragging = false;
    let selectedPointIndex = null;
    let spaceCheck = false;

    let keyValue = 1;
    let shiftValue = 0;
    function handleKeyUp(ev) {
        switch (ev.key) {
            case 'w':
                camera.moveUp(keyValue);
                break;
            case 's':
                camera.moveDown(keyValue);
                break;
            case 'a':
                camera.moveLeft(keyValue);
                break;
            case 'd':
                camera.moveRight(keyValue);
                break;
            case 'Shift':
                shiftValue = 0;
                break;
            case ' ':
                if(spaceCheck == 0) spaceCheck = 1;
                else spaceCheck = 0;
                break;
            default:
                //return;
        }
        console.log(ev);
    }
    function handleKeyDown(ev) {
        switch (ev.key) {
            case 'Shift':
                shiftValue = 1;
                break;
            default:
                //return;
        }
        console.log(ev);
    }
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleKeyDown);
    canvas.onwheel = function(ev)
    {
        camera.moveForward(ev.deltaY*0.1);
    }
    canvas.onmousedown = function(ev)
    {
        if(spaceCheck == 0)
        {
            let x = ev.clientX, y = ev.clientY;
            let bb = ev.target.getBoundingClientRect();
            if (bb.left <= x && x < bb.right && bb.top <= y && y < bb.bottom)
            {
                lastX = x;
                lastY = y;
                dragging = true;
            }
        }
        else
        {
            let rect = canvas.getBoundingClientRect();
            let x = (ev.clientX - rect.left) / canvas.clientWidth * 2 - 1; // NDC X
            let y = -(ev.clientY - rect.top) / canvas.clientHeight * 2 + 1; // NDC Y

            // 포인트 선택 로직
            getPickedVertexIndex(x, y).then(index => {
                if (index !== null) {
                    selectedPointIndex = index;
                    dragging = true;
                }
            });
        }
    }
    canvas.onmouseup = function(ev) { dragging = false; selectedPointIndex = null; };
    canvas.onmousemove = function(ev)
    {
        if(spaceCheck == 0)
        {
            let x = ev.clientX;
            let y = ev.clientY;
            if(dragging)
            {
                let offset = [x - lastX, y - lastY];
                if(offset[0] != 0 || offset[1] != 0) // For some reason, the offset becomes zero sometimes...
                {
                    console.log(shiftValue);
                    if(shiftValue == 0)
                        camera.rotate(offset[0] * -0.01, offset[1] * -0.01);
                    else
                    {
                        camera.moveLeft(offset[0] * keyValue * 0.01);
                        camera.moveUp(offset[1] * keyValue * 0.01);
                    }
                }
            }
            lastX = x;
            lastY = y;
        }
        else
        {
            if (dragging && (selectedPointIndex != null)) {
                let rect = canvas.getBoundingClientRect();
                let x = (ev.clientX - rect.left) / canvas.clientWidth * 2 - 1; // NDC X
                let y = -(ev.clientY - rect.top) / canvas.clientHeight * 2 + 1; // NDC Y

                // 포인트 위치 업데이트 로직
                updatePointPosition(selectedPointIndex, x, y);
            }
        }
    }

    const { connectivitys, base_UV, OrdinaryPointData, extra_base_UV } = await createFVertices(myString, depth);

    let levels = [];
    let levelsize = 0;

    for (let i=0; i<=depth; i++)
        {
            const level = createBufferData(device, obj, i, limit);
            levelsize += level.size;
            levels.push(level);


        }



    let connectivityStorageBuffers = [];
    for (let i=0; i<=depth; i++)
    {
        const connectivityStorageBuffer = device.createBuffer({
            label: 'connectivity buffer vertices',
            size: connectivitys[i].byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(connectivityStorageBuffer, 0, connectivitys[i]);
        connectivityStorageBuffers.push(connectivityStorageBuffer);
    }

    let base_UVStorageBuffers = [];
    for (let i=0; i<=depth; i++)
    {
        const base_UVStorageBuffer = device.createBuffer({
            label: 'base_UV buffer vertices',
            size: base_UV[i].byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(base_UVStorageBuffer, 0, base_UV[i]);
        base_UVStorageBuffers.push(base_UVStorageBuffer);
    }

    let extra_base_UVStorageBuffers = [];
    for (let i=0; i<=depth; i++)
    {
        const extra_base_UVStorageBuffer = device.createBuffer({
            label: 'extra_base_UV buffer vertices',
            size: extra_base_UV[i].byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(extra_base_UVStorageBuffer, 0, extra_base_UV[i]);
        extra_base_UVStorageBuffers.push(extra_base_UVStorageBuffer);
    }

    // async function getPickedVertexIndex(ndcX, ndcY) {
    //     const computeShaderCode = `
    //         struct VertexBuffer {
    //             vertices: array<vec4<f32>>,
    //         };

    //         struct MouseBuffer {
    //             mousePos: vec2<f32>,
    //         };

    //         @group(0) @binding(0) var<storage, read> vertexBuffer: VertexBuffer;
    //         @group(0) @binding(1) var<uniform> mouseBuffer: MouseBuffer;
    //         @group(0) @binding(2) var<storage, read_write> pickedIndex: atomic<u32>;

    //         @compute @workgroup_size(64)
    //         fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    //             let idx = global_id.x;
    //             let vertex = vertexBuffer.vertices[idx];

    //             let dist = distance(vertex.xy, mouseBuffer.mousePos);

    //             // 원자적 최소값 계산을 사용하여 가장 가까운 버텍스 인덱스를 갱신
    //             atomicMin(&pickedIndex, u32(dist * 1000.0));
    //         }
    //     `;

    //     const mouseBuffer = device.createBuffer({
    //         size: 8,
    //         usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    //     });
    //     device.queue.writeBuffer(mouseBuffer, 0, new Float32Array([ndcX, ndcY]));

    //     const storageIndexBuffer = device.createBuffer({
    //         size: 4,
    //         usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    //     });
    //     const readIndexBuffer = device.createBuffer({
    //         size: 4,
    //         usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    //     });
    //     device.queue.writeBuffer(storageIndexBuffer, 0, new Uint32Array([0xFFFFFFFF]));

    //     const computeModule = device.createShaderModule({
    //         code: computeShaderCode,
    //     });

    //     const computePipelineLayout = device.createPipelineLayout({
    //         bindGroupLayouts: [
    //             device.createBindGroupLayout({
    //                 entries: [
    //                     { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    //                     { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    //                     { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
    //                 ]
    //             })
    //         ]
    //     });

    //     const computePipeline = device.createComputePipeline({
    //         layout: computePipelineLayout,
    //         compute: {
    //             module: computeModule,
    //             entryPoint: 'main',
    //         },
    //     });

    //     const bindGroup = device.createBindGroup({
    //         layout: computePipeline.getBindGroupLayout(0),
    //         entries: [
    //             { binding: 0, resource: { buffer: Base_Vertex_Buffer }},
    //             { binding: 1, resource: { buffer: mouseBuffer }},
    //             { binding: 2, resource: { buffer: storageIndexBuffer }}
    //         ]
    //     });

    //     const commandEncoder = device.createCommandEncoder();
    //     const passEncoder = commandEncoder.beginComputePass();
    //     passEncoder.setPipeline(computePipeline);
    //     passEncoder.setBindGroup(0, bindGroup);
    //     passEncoder.dispatchWorkgroups(Base_Vertex_Buffer.size / 4 / 64);
    //     passEncoder.end();
    //     commandEncoder.copyBufferToBuffer(storageIndexBuffer, 0, readIndexBuffer, 0, 4);

    //     const commandBuffer = commandEncoder.finish();
    //     device.queue.submit([commandBuffer]);

    //     await readIndexBuffer.mapAsync(GPUMapMode.READ);
    //     const indexData = new Uint32Array(readIndexBuffer.getMappedRange());
    //     const pickedIndex = indexData[0];
    //     readIndexBuffer.unmap();

    //     return pickedIndex;
    // }

    // function updatePointPosition(index, x, y) {
    //     console.log(`Moving point ${index} to (${x}, ${y})`);

    //     // 실제 버퍼 업데이트 로직
    //     let offset = index*4; // 3D 포인트 위치 (x, y, z)
    //     device.queue.writeBuffer(Base_Vertex_Buffer, offset, new Float32Array([x*100, y*100]), 0, 2);
    // }

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

    const { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipelines, pipeline2, pipelineAnime, xyzPipeline, pipeline_Limit } = await createPipelines(device, presentationFormat);

    async function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        const startTime = performance.now();

        if(settings.getProterty('animation'))
        {
            Base_Vertex = new Float32Array(animationBase['Base_Vertex'+String(parseInt(  now*100%100  )).padStart(2, '0')]);
        }

        let Base_Vertex_Buffer = device.createBuffer({
            label: 'Base_Vertex_Buffer',
            size : levelsize,
            usage : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        device.queue.writeBuffer(Base_Vertex_Buffer, 0, Base_Vertex);

        let Base_Normal_Buffer = device.createBuffer({
            label: 'Base_Normal_Buffer',
            size : levelsize,
            usage : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        const { fixedBindGroups, OrdinaryPointfixedBindGroup, OrdinaryPointBuffers, animeBindGroup, changedBindGroups }
            = await changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, Base_Normal_Buffer, displacementBuffer, texture, sampler,
                connectivityStorageBuffers, base_UVStorageBuffers, OrdinaryPointData, extra_base_UVStorageBuffers,
                pipelines, pipeline2, pipelineAnime, depth, settings);

        const { indices, texcoordDatas, indexBuffers, vertexBuffers } = createBuffers(device, depth);

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

        const degToRad = d => d * Math.PI / 180;
        // mat4.projection(canvas.clientWidth, canvas.clientHeight, 10000, matrixValue);
        const aspect = canvas.clientWidth / canvas.clientHeight;
        // mat4.perspective(100, aspect, 1, 300, matrixValue);
        // mat4.translate(matrixValue, [0, 0, -50], matrixValue);
        // mat4.rotateX(matrixValue, degToRad(-25), matrixValue);
        // mat4.rotateY(matrixValue, degToRad(-70), matrixValue);
        // mat4.rotateZ(matrixValue, degToRad(180), matrixValue);
        // mat4.scale(matrixValue, [1,1,1], matrixValue);


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

        const encoder = device.createCommandEncoder();

        const passAnime = encoder.beginComputePass();
        passAnime.setPipeline(pipelineAnime);
        passAnime.setBindGroup(0, animeBindGroup);
        passAnime.dispatchWorkgroups(65535);
        passAnime.end();


        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        let bindGroups = [];
        for (let i=0; i<=depth; i++)
        {
            bindGroups.push(createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer, levels[i],i+1));
        }

        // base_vertex_buffer 갱신

        const encoder3 = device.createCommandEncoder({ label : 'encoder3',});

        let computePassData = [];

        for (let i=0; i<=depth; i++)
        {
            computePassData.push({prefix: '_'+(i),
                bindGroup_Face: bindGroups[i].bindGroup_Face,
                bindGroup_Edge: bindGroups[i].bindGroup_Edge,
                bindGroup_Vertex: bindGroups[i].bindGroup_Vertex});
        }

        for (const data of computePassData) {
            const prefix = data.prefix;
            const bindGroup_Face = data.bindGroup_Face;
            const bindGroup_Edge = data.bindGroup_Edge;
            const bindGroup_Vertex = data.bindGroup_Vertex;

            const pass_Face = encoder3.beginComputePass();
            pass_Face.setPipeline(pipeline_Face);
            pass_Face.setBindGroup(0, bindGroup_Face);
            pass_Face.dispatchWorkgroups(65535);
            pass_Face.end();

            const pass_Edge = encoder3.beginComputePass();
            pass_Edge.setPipeline(pipeline_Edge);
            pass_Edge.setBindGroup(0, bindGroup_Edge);
            pass_Edge.dispatchWorkgroups(65535);
            pass_Edge.end();

            const pass_Vertex = encoder3.beginComputePass();
            pass_Vertex.setPipeline(pipeline_Vertex);
            pass_Vertex.setBindGroup(0, bindGroup_Vertex);
            pass_Vertex.dispatchWorkgroups(65535);
            pass_Vertex.end();
        }
        // encoder3.copyBufferToBuffer(Base_Vertex_Buffer, 0, Base_Vertex_Read_Buffer, 0, Base_Vertex_Buffer.size);
        const commandBuffer3 = encoder3.finish();
        device.queue.submit([commandBuffer3]);



        const encoder2 = device.createCommandEncoder();
        const pass = encoder2.beginRenderPass(renderPassDescriptor);

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
        for (let i = 0; i <= depth; i++) {
            pass.setBindGroup(1, changedBindGroups[i+(depth+1)*pipelineValue]);
            pass.setVertexBuffer(0, vertexBuffers[N][i]);
            pass.setIndexBuffer(indexBuffers[N][i], 'uint32');
            if(settings.getProterty('draw')[i] == true) {
                let j = i;
                if (i > 4); j = 4;
                pass.drawIndexed(narray[i] * narray[i] * 6,  j * 2 * 1000 + 100000);
                // pass.drawIndexed(narray[i] * narray[i] * 6, 1);
            }
        }
        pass.end();
        const commandBuffer2 = encoder2.finish();
        device.queue.submit([commandBuffer2]);


        const limit_P = new Int32Array(limit[settings.getProterty('ordinaryLevel')].data.flat());
        const limit_Buffer = device.createBuffer({size: limit_P.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
        device.queue.writeBuffer(limit_Buffer, 0, limit_P);


        /*for limit*/
        const bindGroup_Limit = device.createBindGroup({
            label: `bindGroup for Limit`,
            layout: pipeline_Limit.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: Base_Vertex_Buffer}},
                {binding: 1, resource: {buffer: limit_Buffer}}
            ],
        });

        const encoder_limit = device.createCommandEncoder({ label : 'encoder for limit position',});
        const pass_Limit = encoder_limit.beginComputePass();
        pass_Limit.setPipeline(pipeline_Limit);
        pass_Limit.setBindGroup(0, bindGroup_Limit);
        pass_Limit.dispatchWorkgroups(65535);
        pass_Limit.end();
        const commandBuffer_limit = encoder_limit.finish();
        device.queue.submit([commandBuffer_limit]);


        

        // 여기 사이





        // 새로운 버퍼 생성 (usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
        const OrdinaryBuffer = device.createBuffer({
            label: 'OrdinaryBuffer',
            size: Base_Vertex_Buffer.size,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        // 커맨드 엔코더 생성
        const commandEncoder = device.createCommandEncoder();
        // 데이터 복사를 위한 커맨드 추가
        commandEncoder.copyBufferToBuffer(
            Base_Vertex_Buffer, // 소스 버퍼
            0, // 소스 오프셋
            OrdinaryBuffer, // 대상 버퍼
            0, // 대상 오프셋
            Base_Vertex_Buffer.size // 복사할 데이터 크기
        );
        // 커맨드 제출draw
        const commandBuffer4 = commandEncoder.finish();
        device.queue.submit([commandBuffer4]);



        const encoder5 = device.createCommandEncoder();
        const pass_2 = encoder5.beginRenderPass(renderPassDescriptor2);

        ordinaryValue = settings.getProterty('ordinaryLevel');
        if(ordinaryValue > depth) ordinaryValue = depth
        pass_2.setPipeline(pipeline2);
        pass_2.setBindGroup(0, OrdinaryPointfixedBindGroup);
        pass_2.setVertexBuffer(0, OrdinaryBuffer); //base_vertex_buffer, 1,1,1,1,1,1
        // pass_2.setIndexBuffer(OrdinaryPointBuffers[ordinaryValue], 'uint32'); // 1, 2, 3, 3, 2, 4
        pass_2.draw(6, OrdinaryPointBuffers[ordinaryValue].size / 24); // 4byte * 6vertex
        // pass_2.draw(6, 1); // 4byte * 6vertex
        // pass_2.drawIndexed(OrdinaryPointBuffers[ordinaryValue].size / 4); //6000
        pass_2.end();

        if (canTimestamp) {
            encoder5.resolveQuerySet(querySet, 0, querySet.count, resolveBuffer, 0);
            if (resultBuffer.mapState === 'unmapped') {
                encoder5.copyBufferToBuffer(resolveBuffer, 0, resultBuffer, 0, resultBuffer.size);
            }
        }

        const commandBuffer5 = encoder5.finish();
        device.queue.submit([commandBuffer5]);

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