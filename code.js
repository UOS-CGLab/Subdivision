import { mat4 } from './src/mat4.js';
import { fpsAverage, jsAverage, gpuAverage } from './src/RollingAverage.js';
import { createFVertices } from './src/createFVertices.js';
import { initializeWebGPU, fetchData } from './src/initializeWebGPU.js';
import { initializeScene } from './src/gui.js';
import { createBufferData, createBindGroup, changedBindGroup } from './src/createBindGroups.js';
import { createPipelines } from './src/pipelines.js';
import { createBuffers } from './src/makeBuffer.js';
import { Camera } from './src/camera.js';
import * as mat4_2 from "./gl-matrix/mat4.js";
const myString = "9";
// const depth = 6;

async function main() {
    const camera = new Camera();

    function handleKeyPress(event) {
        switch (event.key) {
            case 'w':
                camera.moveForward(0.1);
                break;
            case 's':
                camera.moveBackward(0.1);
                break;
            case 'a':
                camera.moveLeft(0.1);
                break;
            case 'd':
                camera.moveRight(0.1);
                break;
            default:
            return;
        }
        //locationValue.set(camera.position);
        //console.log('camera:', camera.position, camera.direction, camera.up)
        render();
    }

    let before_x = 0;
    let before_y = 0;

    let pressed = false;
    
    function handlemousedown(event) {
        // before_x = event.clientX;
        // before_y = event.clientY;
        // console.log("down");
        pressed = true;
    }
    
    function handlemouseup(event) {
        // const movementX = event.clientX - before_x;
        // const movementY = event.clientY - before_y;
        // camera.rotate(movementX * -0.005, movementY * -0.005);
        // console.log("up");
        // console.log(movementX * 0.005, movementY * 0.005);
        // render();

        pressed = false;
    }
    
    function handleMouseMove(event) {
        if (!pressed) {
            return;
        }
        camera.rotate(event.movementX * -0.01, event.movementY * -0.01);
        // console.log('camera:', camera.position, camera.direction, camera.up)
        render();
    }

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handlemouseup);
    document.addEventListener('mousedown', handlemousedown);

    let depth = 4;

    const { device, context, presentationFormat, canTimestamp } = await initializeWebGPU();
        
    const data = await fetch('./topology.json');
    const data2 = await fetch('./base.json');
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

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
    const viewValue = uniformValues.subarray(viewOffset, viewOffset + 4);
    const timeValue = uniformValues.subarray(timeOffset, timeOffset + 4);


    const { connectivitys, OrdinaryPointData } = await createFVertices(myString, depth);

    let levels = [];
    let levelsize = 0;

    for (let i=0; i<depth; i++)
        {
            const level = createBufferData(device, obj, i);
            levelsize += level.size;
            levels.push(level);
        }

    
    const Base_Vertex = new Float32Array(base.Base_Vertex);
    const Base_Vertex_Buffer = device.createBuffer({
        size : levelsize + Base_Vertex.byteLength*4,
        usage : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(Base_Vertex_Buffer, 0, Base_Vertex);


    let connectivityStorageBuffers = [];
    
    for (let i=0; i<depth+1; i++)
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

    for (let i=0; i<depth+1; i++)
    {
        narray.push(max(2**(depth-1-i),1));
    }

    //let nArray = new Uint32Array(narray);

    let nArray = new Uint32Array([1,1,1,1,1,1, 1]);

    const { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipelines, pipeline2, pipelineAnime } = await createPipelines(device, presentationFormat);
    const { fixedBindGroups, animeBindGroup, changedBindGroups } = await changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, connectivityStorageBuffers, pipelines, pipeline2, pipelineAnime, myString, settings, depth);

    function render(now) {
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

        const matrix = mat4_2.create();
        mat4_2.multiply(matrix, camera.getViewMatrix(), camera.getProjectionMatrix());
    
        mat4.multiply(camera.getProjectionMatrix(), camera.getViewMatrix(), matrixValue);



        // viewValue = new Float32Array([-1*settings.translation.x, -1*settings.translation.y, -1*settings.translation.z, 1]);
        viewValue[0] = settings.translation[0]; viewValue[1] = settings.translation[1]; viewValue[2] = settings.translation[2]; viewValue[3] = 1;
        timeValue[0] = now;

        // upload the uniform values to the uniform buffer
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        const encoder = device.createCommandEncoder();

        const passAnime = encoder.beginComputePass();
        passAnime.setPipeline(pipelineAnime);
        passAnime.setBindGroup(0, animeBindGroup);
        passAnime.dispatchWorkgroups(100);
        passAnime.end();


        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        let bindGroups = [];
        for (let i=0; i<depth; i++) 
        {
            bindGroups.push(createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer,levels[i],i+1));
        }

        const encoder3 = device.createCommandEncoder({ label : 'encoder',});

        let computePassData = [];

        for (let i=0; i<depth; i++)
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
            pass_Face.dispatchWorkgroups(64);
            pass_Face.end();
        
            const pass_Edge = encoder3.beginComputePass();
            pass_Edge.setPipeline(pipeline_Edge);
            pass_Edge.setBindGroup(0, bindGroup_Edge);
            pass_Edge.dispatchWorkgroups(64);
            pass_Edge.end();
        
            const pass_Vertex = encoder3.beginComputePass();
            pass_Vertex.setPipeline(pipeline_Vertex);
            pass_Vertex.setBindGroup(0, bindGroup_Vertex);
            pass_Vertex.dispatchWorkgroups(64);
            pass_Vertex.end();
        }
        const commandBuffer3 = encoder3.finish();
        device.queue.submit([commandBuffer3]);

        const encoder2 = device.createCommandEncoder();
        const pass = encoder2.beginRenderPass(renderPassDescriptor);

        // if (settings.nArray > 6) {nArray = new Uint32Array([64, 32, 16, 8, 4, 2 , 1]);}
        // else if (settings.nArray > 5) {nArray = new Uint32Array([32, 16, 8, 4, 2]);}
        // else if (settings.nArray > 4) {nArray = new Uint32Array([16, 8, 4, 2, 1]);}
        // else if (settings.nArray > 3) {nArray = new Uint32Array([8, 4, 2, 1, 1]);}
        // else if (settings.nArray > 2) {nArray = new Uint32Array([4, 2, 1, 1, 1]);}
        // else if (settings.nArray > 1) {nArray = new Uint32Array([2, 1, 1, 1, 1]);}
        // else if (settings.nArray >= 0) {nArray = new Uint32Array([1, 1, 1, 1, 1]);}

        const { indices, texcoordDatas, indexBuffers, vertexBuffers } = createBuffers(device, nArray, depth);

        for (let i = 0; i < depth + 1; i++) {
            device.queue.writeBuffer(vertexBuffers[i], 0, texcoordDatas[i]);
            device.queue.writeBuffer(indexBuffers[i], 0, indices[i]);
        }
        if(settings.pipelineValue[0] < 1.0)         {pass.setPipeline(pipelines[0]);pass.setBindGroup(0, fixedBindGroups[0]);}
        else if(settings.pipelineValue[0] < 2.0)    {pass.setPipeline(pipelines[1]);pass.setBindGroup(0, fixedBindGroups[1]);}
        else if(settings.pipelineValue[0] < 3.0)    {pass.setPipeline(pipelines[2]);pass.setBindGroup(0, fixedBindGroups[2]);}

        for (let i = 0; i < depth + 1; i++) {
            pass.setBindGroup(1, changedBindGroups[i+(depth+1)*parseInt(settings.pipelineValue[0])]);
            pass.setVertexBuffer(0, vertexBuffers[i]);
            pass.setIndexBuffer(indexBuffers[i], 'uint32');
            if(settings.draw[i] > 0.5) {
                let j = i;
                if (i > 4); j = 4;
                pass.drawIndexed(nArray[i] * nArray[i] * 6,  j * 2 * 1000 + 1000);
            }
        }
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