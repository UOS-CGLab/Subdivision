// import { mat4 } from './src/mat4.js';
import {mat4} from 'https://webgpufundamentals.org/3rdparty/wgpu-matrix.module.js';
import { fpsAverage, jsAverage, gpuAverage } from './src/RollingAverage.js';
import { initializeWebGPU, fetchData } from './src/initializeWebGPU.js';
import { initializeScene } from './src/gui.js';
import { createBindGroup, changedBindGroup, extraBindGroup, createBindGroup_Limit } from './src/createBindGroups.js';
import { createPipelines } from './src/pipelines.js';
import { Camera, mouse_move, addkeyboardEvent} from './src/camera.js';

import { uniform_buffers, buffers} from './src/buffers.js';

let myString = "monsterfrog";
let backgroundString = "space";
let depth = 6;

async function main() {
    let { canvas, device, context, presentationFormat, canTimestamp } = await initializeWebGPU();
    const camera = new Camera();
    const skyboxCamera = new Camera();
    let keyValue = 1;
    canvas, keyValue = mouse_move(canvas, camera);
    addkeyboardEvent(camera);

    let { settings, lightPosition } = initializeScene(camera);

    let then = 0;
    let depthTexture;
    const infoElem = document.querySelector('#info');
    let gpuTime = 0;

    let narray = [1, 1, 1, 1, 1, 1, 1, 1];
    let pipelineValue = 1;

    let { uniformBuffer, uniformValues, matrixValue, viewValue, timeValue, wireValue, displacementValue, colorValue } = uniform_buffers(device);



        
    async function changeString(string) {
        let { obj, Base_Vertex, animationBase, limit } = await fetchData(myString);

        let {
            levels,
            connectivityStorageBuffers,
            base_UVStorageBuffers,
            extra_base_UVStorageBuffers,
            extra_vertex_offsetStorageBuffers,
            extra_vertex_indexesStorageBuffers,
            textureBuffer,
            indices,
            texcoordDatas,
            indexBuffers,
            vertexBuffers,
            Base_Vertex_Buffer,
            Base_Normal_Buffer,
            OrdinaryPointData,
            textures,
            videoSource,
            sampler,
            limit_Buffers,
            Base_Vertex_After_Buffer,
            OrdinaryBuffer
        } = await buffers(device, depth, obj, limit, string);

        let { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipeline_webCam, pipelines, pipeline2, pipelineAnime, pipeline_Limit } = await createPipelines(device, presentationFormat);
        
        let { fixedBindGroups, animeBindGroup, changedBindGroups } = await changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, Base_Normal_Buffer, textures, sampler, textureBuffer, connectivityStorageBuffers, base_UVStorageBuffers, pipelines, pipelineAnime, depth);
        
        let bindGroups = [];
        for (let i=0; i<=depth; i++){
            bindGroups.push(createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer, levels[i],i+1));
        }

        return {
            obj, Base_Vertex, animationBase, limit,
            levels,
            connectivityStorageBuffers,
            base_UVStorageBuffers,
            extra_base_UVStorageBuffers,
            extra_vertex_offsetStorageBuffers,
            extra_vertex_indexesStorageBuffers,
            textureBuffer,
            indices,
            texcoordDatas,
            indexBuffers,
            vertexBuffers,
            Base_Vertex_Buffer,
            Base_Normal_Buffer,
            OrdinaryPointData,
            textures,
            videoSource,
            sampler,
            limit_Buffers,
            Base_Vertex_After_Buffer,
            OrdinaryBuffer,
            pipeline_Face, pipeline_Edge, pipeline_Vertex, pipeline_webCam, pipelines, pipeline2, pipelineAnime, pipeline_Limit,
            fixedBindGroups, animeBindGroup, changedBindGroups,
            bindGroups,
        }
    }

    let {
        obj, Base_Vertex, animationBase, limit,
        levels,
        connectivityStorageBuffers,
        base_UVStorageBuffers,
        extra_base_UVStorageBuffers,
        extra_vertex_offsetStorageBuffers,
        extra_vertex_indexesStorageBuffers,
        textureBuffer,
        indices,
        texcoordDatas,
        indexBuffers,
        vertexBuffers,
        Base_Vertex_Buffer,
        Base_Normal_Buffer,
        OrdinaryPointData,
        textures,
        videoSource,
        sampler,
        limit_Buffers,
        Base_Vertex_After_Buffer,
        OrdinaryBuffer,
        pipeline_Face, pipeline_Edge, pipeline_Vertex, pipeline_webCam, pipelines, pipeline2, pipelineAnime, pipeline_Limit,
        fixedBindGroups, animeBindGroup, changedBindGroups,
        bindGroups,
    } = await changeString(myString);


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




    

    const skyBoxModule = device.createShaderModule({
        code: `
          struct Uniforms {
            viewDirectionProjectionInverse: mat4x4f,
          };
    
          struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) pos: vec4f,
          };
    
          @group(0) @binding(0) var<uniform> uni: Uniforms;
          @group(0) @binding(1) var ourSampler: sampler;
          @group(0) @binding(2) var ourTexture: texture_cube<f32>;
    
          @vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
            let pos = array(
              vec2f(-1, 3),
              vec2f(-1,-1),
              vec2f( 3,-1),
            );
            var vsOut: VSOutput;
            vsOut.position = vec4f(pos[vNdx], 1, 1);
            vsOut.pos = vsOut.position;
            return vsOut;
          }
    
          @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            let t = uni.viewDirectionProjectionInverse * vsOut.pos;
            return textureSample(ourTexture, ourSampler, normalize(t.xyz / t.w) * vec3f(1, 1, -1));
          }
        `,
      });
    
      const skyBoxPipeline = device.createRenderPipeline({
        label: 'no attributes',
        layout: 'auto',
        vertex: {
          module: skyBoxModule,
        },
        fragment: {
          module: skyBoxModule,
          targets: [{ format: presentationFormat }],
        },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: 'less-equal',
          format: 'depth24plus',
        },
      });
    
      const numMipLevels = (...sizes) => {
        const maxSize = Math.max(...sizes);
        return 1 + Math.log2(maxSize) | 0;
      };
    
      function copySourcesToTexture(device, texture, sources, {flipY} = {}) {
        sources.forEach((source, layer) => {
          device.queue.copyExternalImageToTexture(
            { source, flipY, },
            { texture, origin: [0, 0, layer] },
            { width: source.width, height: source.height },
          );
        });
        if (texture.mipLevelCount > 1) {
          generateMips(device, texture);
        }
      }
    
      function createTextureFromSources(device, sources, options = {}) {
        // Assume are sources all the same size so just use the first one for width and height
        const source = sources[0];
        const texture = device.createTexture({
          format: 'rgba8unorm',
          mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
          size: [source.width, source.height, sources.length],
          usage: GPUTextureUsage.TEXTURE_BINDING |
                 GPUTextureUsage.COPY_DST |
                 GPUTextureUsage.RENDER_ATTACHMENT,
        });
        copySourcesToTexture(device, texture, sources, options);
        return texture;
      }

      const generateMips = (() => {
        let sampler;
        let module;
        const pipelineByFormat = {};
    
        return function generateMips(device, texture) {
          if (!module) {
            module = device.createShaderModule({
              label: 'textured quad shaders for mip level generation',
              code: `
                struct VSOutput {
                  @builtin(position) position: vec4f,
                  @location(0) texcoord: vec2f,
                };
    
                @vertex fn vs(
                  @builtin(vertex_index) vertexIndex : u32
                ) -> VSOutput {
                  let pos = array(
    
                    vec2f( 0.0,  0.0),  // center
                    vec2f( 1.0,  0.0),  // right, center
                    vec2f( 0.0,  1.0),  // center, top
    
                    // 2st triangle
                    vec2f( 0.0,  1.0),  // center, top
                    vec2f( 1.0,  0.0),  // right, center
                    vec2f( 1.0,  1.0),  // right, top
                  );
    
                  var vsOutput: VSOutput;
                  let xy = pos[vertexIndex];
                  vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
                  vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
                  return vsOutput;
                }
    
                @group(0) @binding(0) var ourSampler: sampler;
                @group(0) @binding(1) var ourTexture: texture_2d<f32>;
    
                @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
                  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
                }
              `,
            });
    
            sampler = device.createSampler({
              minFilter: 'linear',
              magFilter: 'linear',
            });
          }
    
          if (!pipelineByFormat[texture.format]) {
            pipelineByFormat[texture.format] = device.createRenderPipeline({
              label: 'mip level generator pipeline',
              layout: 'auto',
              vertex: {
                module,
              },
              fragment: {
                module,
                targets: [{ format: texture.format }],
              },
            });
          }
          const pipeline = pipelineByFormat[texture.format];
    
          const encoder = device.createCommandEncoder({
            label: 'mip gen encoder',
          });
    
          let width = texture.width;
          let height = texture.height;
          let baseMipLevel = 0;
          while (width > 1 || height > 1) {
            width = Math.max(1, width / 2 | 0);
            height = Math.max(1, height / 2 | 0);
    
            for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
              const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                  { binding: 0, resource: sampler },
                  {
                    binding: 1,
                    resource: texture.createView({
                      dimension: '2d',
                      baseMipLevel,
                      mipLevelCount: 1,
                      baseArrayLayer: layer,
                      arrayLayerCount: 1,
                    }),
                  },
                ],
              });
    
              const renderPassDescriptor = {
                label: 'our basic canvas renderPass',
                colorAttachments: [
                  {
                    view: texture.createView({
                      dimension: '2d',
                      baseMipLevel: baseMipLevel + 1,
                      mipLevelCount: 1,
                      baseArrayLayer: layer,
                      arrayLayerCount: 1,
                    }),
                    loadOp: 'clear',
                    storeOp: 'store',
                  },
                ],
              };
    
              const pass = encoder.beginRenderPass(renderPassDescriptor);
              pass.setPipeline(pipeline);
              pass.setBindGroup(0, bindGroup);
              pass.draw(6);  // call our vertex shader 6 times
              pass.end();
            }
            ++baseMipLevel;
          }
    
          const commandBuffer = encoder.finish();
          device.queue.submit([commandBuffer]);
        };
      })();

      async function loadImageBitmap(url) {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
      }
    
      async function createTextureFromImages(device, urls, options) {
        const images = await Promise.all(urls.map(loadImageBitmap));
        return createTextureFromSources(device, images, options);
      }

    async function changeBackground(backgroundString) {
        let texture = await createTextureFromImages(
            device,
            [
              `./${backgroundString}/px.png`,  
              `./${backgroundString}/nx.png`,  
              `./${backgroundString}/py.png`,  
              `./${backgroundString}/ny.png`,  
              `./${backgroundString}/pz.png`,  
              `./${backgroundString}/nz.png`,  
            ],
            {mips: true, flipY: false},
        );
        const skyBoxBindGroup = device.createBindGroup({
          label: 'bind group for object',
          layout: skyBoxPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: skyBoxUniformBuffer }},
            { binding: 1, resource: sampler2 },
            { binding: 2, resource: texture.createView({dimension: 'cube'}) },
          ],
        });

        return {texture, skyBoxBindGroup};
    }
    
    const sampler2 = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    });
  
    // viewDirectionProjectionInverse
    const skyBoxUniformBufferSize = (16) * 4;
    const skyBoxUniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: skyBoxUniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  
    const skyBoxUniformValues = new Float32Array(skyBoxUniformBufferSize / 4);
  
    // offsets to the various uniform values in float32 indices
    const kViewDirectionProjectionInverseOffset = 0;
  
    const viewDirectionProjectionInverseValue = skyBoxUniformValues.subarray(
        kViewDirectionProjectionInverseOffset,
        kViewDirectionProjectionInverseOffset + 16);
    
        // projection, view, world, cameraPosition, pad
        const envMapUniformBufferSize = (16 + 16 + 16 + 3 + 1) * 4;
      
        const envMapUniformValues = new Float32Array(envMapUniformBufferSize / 4);
      
        // offsets to the various uniform values in float32 indices
        const kProjectionOffset = 0;
        const kViewOffset = 16;
        const kCameraPositionOffset = 32;
      
        const projectionValue = envMapUniformValues.subarray(kProjectionOffset, kProjectionOffset + 16);
        const viewValue2 = envMapUniformValues.subarray(kViewOffset, kViewOffset + 16);
        const cameraPositionValue = envMapUniformValues.subarray(
            kCameraPositionOffset, kCameraPositionOffset + 3);
    
      let { texture, skyBoxBindGroup } = await changeBackground(backgroundString);

    





    async function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        const startTime = performance.now();
        
        let lastString = settings.getProterty('object');
        let lastBackgroundString = settings.getProterty('background');

        if(myString != lastString){
            myString = lastString;
            ({
                obj, Base_Vertex, animationBase, limit,
                levels,
                connectivityStorageBuffers,
                base_UVStorageBuffers,
                extra_base_UVStorageBuffers,
                extra_vertex_offsetStorageBuffers,
                extra_vertex_indexesStorageBuffers,
                textureBuffer,
                indices,
                texcoordDatas,
                indexBuffers,
                vertexBuffers,
                Base_Vertex_Buffer,
                Base_Normal_Buffer,
                OrdinaryPointData,
                textures,
                videoSource,
                sampler,
                limit_Buffers,
                Base_Vertex_After_Buffer,
                OrdinaryBuffer,
                pipeline_Face, pipeline_Edge, pipeline_Vertex, pipeline_webCam, pipelines, pipeline2, pipelineAnime, pipeline_Limit,
                fixedBindGroups, animeBindGroup, changedBindGroups,
                bindGroups,
            } = await changeString(myString));
        }
        if(backgroundString != lastBackgroundString){
            backgroundString = lastBackgroundString;
            ({texture, skyBoxBindGroup} = await changeBackground(backgroundString));
        }

        if (videoSource instanceof HTMLVideoElement) {
            // 실제 비디오에서 텍스처로 복사
            device.queue.copyExternalImageToTexture(
                { source: videoSource },
                { texture: textures[2] },
                [videoSource.videoWidth, videoSource.videoHeight, 1]
            );
        } else {
            const ctx = videoSource.canvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 640, 480); // 빈 화면 처리
    
            device.queue.copyExternalImageToTexture(
                { source: videoSource.canvas },
                { texture: textures[2] },
                [640, 480, 1]
            );
        }

        // // const textureView = context.getCurrentTexture().createView();
        // device.queue.copyExternalImageToTexture(
        //     { source: video },
        //     { texture: textures[2] },
        //     [video.videoWidth, video.videoHeight, 1],
        // );
        
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












        
        const aspect = canvas.clientWidth / canvas.clientHeight;
        mat4.perspective(
            60 * Math.PI / 180,
            aspect,
            0.1,      // zNear
            10,      // zFar
            projectionValue,
        );
        // Camera going in circle from origin looking at origin
        cameraPositionValue.set([Math.cos(now * 0.02) * 5, Math.sin(now * 0.04) * 3, Math.sin(now * 0.02) * 5]);
        const view = mat4.lookAt(
          cameraPositionValue,
          [0, 0, 0],  // target
          [0, 1, 0],  // up
        );
        // Copy the view into the viewValue since we're going
        // to zero out the view's translation
        viewValue2.set(view);
    
        // We only care about direction so remove the translation
        view[12] = 0;
        view[13] = 0;
        view[14] = 0;
        const viewProjection = mat4.multiply(projectionValue, view);
        mat4.inverse(viewProjection, viewDirectionProjectionInverseValue);
    
        // upload the uniform values to the uniform buffers
        device.queue.writeBuffer(skyBoxUniformBuffer, 0, skyBoxUniformValues);














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
            case 'green_rubber': { colorValue[0] = 8; break; }
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
                pass.drawIndexed(narray[i] * narray[i] * 6,  levels[i].size/4);
            }
        }
        
        // Draw the skyBox
        pass.setPipeline(skyBoxPipeline);
        pass.setBindGroup(0, skyBoxBindGroup);
        pass.draw(3);

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

        const OrdinaryPointfixedBindGroup = await extraBindGroup(device, uniformBuffer, OrdinaryPointData, Base_Vertex_After_Buffer, Base_Normal_Buffer, textures, sampler, extra_base_UVStorageBuffers, extra_vertex_offsetStorageBuffers, extra_vertex_indexesStorageBuffers, pipeline2, depth, settings)

        encoder = device.createCommandEncoder({ label : 'ordinary buffer encoder',});
        encoder.copyBufferToBuffer(Base_Vertex_Buffer, 0, OrdinaryBuffer, 0, Base_Vertex_Buffer.size);

        make_render_encoder(device, renderPassDescriptor2, pipeline2, OrdinaryPointfixedBindGroup, OrdinaryBuffer, false, 6*OrdinaryPointData[settings.getProterty('ordinaryLevel')].length, 65535, 'ordinary draw encoder');


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
            const aspectRatio = 16 / 9;  // 고정된 비율 (예: 16:9) // 16 / 9
    
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
            canvas.style.position = 'absolute';
    
            // 비율을 유지하며 너비와 높이를 설정
            if (width / height > aspectRatio) {
                width = height * aspectRatio;
            } else {
                height = width / aspectRatio;
            }
    
            // 캔버스 크기를 비율에 맞게 조정
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
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
    // if(indexBuffer){
    //     pass.setIndexBuffer(indexBuffer, 'uint32');
    //     pass.drawIndexed(draw_size);// parameter가 2개여야 한다.
    // }
    // else {
        pass.draw(draw_size);
        // pass.draw(6 * 15);
    // }
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}



main();
