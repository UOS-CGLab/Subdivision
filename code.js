import { mat4 } from './src/mat4.js';
import { fpsAverage, jsAverage, gpuAverage } from './src/RollingAverage.js';
import { createFVertices } from './src/createFVertices.js';
import { initializeWebGPU, fetchData } from './src/initializeWebGPU.js';
import { initializeScene } from './src/gui.js';
import { createBufferData, createBindGroup, changedBindGroup } from './src/createBindGroups.js';
import { createPipelines } from './src/pipelines.js';
import { createBuffers } from './src/makeBuffer.js';
import { Camera } from './src/camera.js';


const myString = "suzanne";
const depth = 5;

async function main() {
    const { canvas, device, context, presentationFormat, canTimestamp } = await initializeWebGPU();
    const camera = new Camera();

    const data = await fetch('./'+myString+'/topology.json');
    const data2 = await fetch('./'+myString+'/base.json');
    const obj = await data.json();
    const base = await data2.json();
    
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
    const wireOffset = 21;

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
    const viewValue = uniformValues.subarray(viewOffset, viewOffset + 4);
    const timeValue = uniformValues.subarray(timeOffset, timeOffset + 1);
    const wrieValue = uniformValues.subarray(timeOffset, timeOffset + 1);

    let lastX;
    let lastY;
    let angle = [0,0];
    let dragging = false;

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
        let x = ev.clientX, y = ev.clientY;
        let bb = ev.target.getBoundingClientRect();
        if (bb.left <= x && x < bb.right && bb.top <= y && y < bb.bottom)
        {
            lastX = x;
            lastY = y;
            dragging = true;
        }
    }
    canvas.onmouseup = function(ev) { dragging = false; };
    canvas.onmousemove = function(ev)
    {    
        let x = ev.clientX;
        let y = ev.clientY;
        if(dragging)
        {
            let offset = [x - lastX, y - lastY];
            if(offset[0] != 0 || offset[1] != 0) // For some reason, the offset becomes zero sometimes...
            {
                // mat4.copy(VP, P);
                // mat4.multiply(VP, VP, V);
                // let axis = unproject_vector([offset[1], offset[0], 0], VP, 
                //     gl.getParameter(gl.VIEWPORT));
                // mat4.rotate(V, V, toRadian(length2(offset)), [axis[0], axis[1], axis[2]]);
                console.log(shiftValue);
                if(shiftValue == 0)
                    camera.rotate(offset[0] * -0.01, offset[1] * -0.01);
                else
                {
                    camera.moveLeft(offset[0] * keyValue * 0.01);
                    camera.moveDown(offset[1] * keyValue * 0.01);
                }
            }
        }
        lastX = x;
        lastY = y;
    }

    const { connectivitys, OrdinaryPointData } = await createFVertices(myString, depth);
    
    let levels = [];
    let levelsize = 0;

    for (let i=0; i<=depth; i++)
        {
            const level = createBufferData(device, obj, i);
            levelsize += level.size;
            levels.push(level);
        }
    
    console.log(levels);
    
    const Base_Vertex = new Float32Array(base.Base_Vertex);
    let Base_Vertex_Buffer = device.createBuffer({
        label: 'Base_Vertex_Buffer',
        size : levelsize + Base_Vertex.byteLength*4,
        usage : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(Base_Vertex_Buffer, 0, Base_Vertex);
    let Base_Vertex_Read_Buffer = device.createBuffer({
        label: 'Base_Vertex_Read_Buffer',
        size : Base_Vertex_Buffer.size,
        usage : GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    let connectivityStorageBuffers = [];

    for (let i=0; i<=depth; i++)
    {
        const connectivityStorageBuffer = device.createBuffer({
            label: 'storage buffer vertices',
            size: connectivitys[i].byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(connectivityStorageBuffer, 0, connectivitys[i]);
        connectivityStorageBuffers.push(connectivityStorageBuffer);
    }

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

    const { settings } = initializeScene();

    let then = 0;

    let depthTexture;

    const infoElem = document.querySelector('#info');
    let gpuTime = 0;

    let narray = [];

    for (let i=0; i<=depth; i++)
    {
        narray.push(max(2**(depth-1-i),1));
    }

    let nArray = new Uint32Array([1,1,1,1,1,1, 1]);
    let pipelineValue = 1;
    let ordinaryValue = 1;

    const { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipelines, pipeline2, pipelineAnime } = await createPipelines(device, presentationFormat);
    const { fixedBindGroups, OrdinaryPointfixedBindGroup, OrdinaryPointBuffers, animeBindGroup, changedBindGroups } = await changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, connectivityStorageBuffers, pipelines, pipeline2, pipelineAnime, myString, settings, depth);

    async function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        const startTime = performance.now();

        const canvasTexture = context.getCurrentTexture();
        renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

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

        // mat4.projection(canvas.clientWidth, canvas.clientHeight, 10000, matrixValue);
        const aspect = canvas.clientWidth / canvas.clientHeight;
        mat4.perspective(100, aspect, 1, 300, matrixValue);
        mat4.translate(matrixValue, settings.translation, matrixValue);
        mat4.rotateX(matrixValue, settings.rotation[0], matrixValue);
        mat4.rotateY(matrixValue, settings.rotation[1], matrixValue);
        mat4.rotateZ(matrixValue, settings.rotation[2], matrixValue);
        mat4.scale(matrixValue, settings.scale, matrixValue);

        if(settings.temp > 0.5)
        {
            const matrix = mat4.create();
            mat4.multiply(matrix, camera.getViewMatrix(), camera.getProjectionMatrix());
        
            camera.update();
            mat4.multiply(camera.getProjectionMatrix(), camera.getViewMatrix(), matrixValue);
        }
        keyValue = settings.keyValue;

        // viewValue = new Float32Array([-1*settings.translation.x, -1*settings.translation.y, -1*settings.translation.z, 1]);
        viewValue[0] = settings.translation[0]; viewValue[1] = settings.translation[1]; viewValue[2] = settings.translation[2]; viewValue[3] = 1;
        timeValue[0] = now;
        wrieValue[0] = settings.wireframe[0];

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
            bindGroups.push(createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer,levels[i],i+1));
        }

        // base_vertex_buffer 갱신
        
        const encoder3 = device.createCommandEncoder({ label : 'encoder',});

        let computePassData = [];

        for (let i=0; i<=depth; i++)
        {
            computePassData.push({prefix: '_'+(i), bindGroup_Face: bindGroups[i].bindGroup_Face, bindGroup_Edge: bindGroups[i].bindGroup_Edge, bindGroup_Vertex: bindGroups[i].bindGroup_Vertex});
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
        encoder3.copyBufferToBuffer(Base_Vertex_Buffer, 0, Base_Vertex_Read_Buffer, 0, Base_Vertex_Buffer.size);
        const commandBuffer3 = encoder3.finish();
        device.queue.submit([commandBuffer3]);

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
        // 커맨드 제출
        const commandBuffer4 = commandEncoder.finish();
        device.queue.submit([commandBuffer4]);

        const encoder2 = device.createCommandEncoder();
        const pass = encoder2.beginRenderPass(renderPassDescriptor);

        if (settings.nArray > 6) {nArray = new Uint32Array([64, 32, 16, 8, 4, 2, 1]);}
        else if (settings.nArray > 5) {nArray = new Uint32Array([32, 16, 8, 4, 2, 1, 1]);}
        else if (settings.nArray > 4) {nArray = new Uint32Array([16, 8, 4, 2, 1, 1, 1]);}
        else if (settings.nArray > 3) {nArray = new Uint32Array([8, 4, 2, 1, 1, 1, 1]);}
        else if (settings.nArray > 2) {nArray = new Uint32Array([4, 2, 1, 1, 1, 1, 1]);}
        else if (settings.nArray > 1) {nArray = new Uint32Array([2, 1, 1, 1, 1, 1, 1]);}
        else if (settings.nArray >= 0) {nArray = new Uint32Array([1, 1, 1, 1, 1, 1, 1]);}

        const { indices, texcoordDatas, indexBuffers, vertexBuffers } = createBuffers(device, nArray, depth);

        for (let i = 0; i <= depth; i++) {
            device.queue.writeBuffer(vertexBuffers[i], 0, texcoordDatas[i]);
            device.queue.writeBuffer(indexBuffers[i], 0, indices[i]);
        }
        if(settings.pipelineValue[0] < 1.0)         pipelineValue = 0;
        else if(settings.pipelineValue[0] < 2.0)    pipelineValue = 1;
        else if(settings.pipelineValue[0] < 3.0)    pipelineValue = 2;

        pass.setPipeline(pipelines[pipelineValue]);
        pass.setBindGroup(0, fixedBindGroups[pipelineValue]);
        for (let i = 0; i <= depth; i++) {
            pass.setBindGroup(1, changedBindGroups[i+(depth+1)*parseInt(settings.pipelineValue[0])]);
            pass.setVertexBuffer(0, vertexBuffers[i]);
            pass.setIndexBuffer(indexBuffers[i], 'uint32');
            if(settings.draw[i] > 0.5) {
                let j = i;
                if (i > 4); j = 4;
                pass.drawIndexed(nArray[i] * nArray[i] * 6,  j * 2 * 1000 + 100000);
            }
        }
        ordinaryValue = parseInt(settings.ordinaryValue);
        if(ordinaryValue > depth) ordinaryValue = depth
        pass.setPipeline(pipeline2);
        pass.setBindGroup(0, OrdinaryPointfixedBindGroup);
        pass.setVertexBuffer(0, OrdinaryBuffer); //base_vertex_buffer
        pass.setIndexBuffer(OrdinaryPointBuffers[ordinaryValue], 'uint32');
        pass.drawIndexed(OrdinaryPointBuffers[ordinaryValue].size / 4);
        pass.end();

        if (canTimestamp) {
            encoder2.resolveQuerySet(querySet, 0, querySet.count, resolveBuffer, 0);
            if (resultBuffer.mapState === 'unmapped') {
                encoder2.copyBufferToBuffer(resolveBuffer, 0, resultBuffer, 0, resultBuffer.size);
            }
        }

        const commandBuffer2 = encoder2.finish();
        device.queue.submit([commandBuffer2]);

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
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
        }
    });
    observer.observe(canvas);
}

function max(a, b) {
    return a > b ? a : b;
}

main();