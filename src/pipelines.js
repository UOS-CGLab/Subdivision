export async function createPipelines(device, presentationFormat) {

    const module_Face = device.createShaderModule({
        code: `
        @group(0) @binding(0) var<storage, read> vertex_F: array<i32>;
        @group(0) @binding(1) var<storage, read> offset_F: array<i32>;
        @group(0) @binding(2) var<storage, read> valance_F: array<i32>;
        @group(0) @binding(3) var<storage, read> pointIdx_F: array<i32>;
        @group(0) @binding(4) var<storage, read_write> baseVertex: array<f32>;


        @compute @workgroup_size(256) 
        fn compute_FacePoint(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
            let id = global_invocation_id.x;
            let start = u32(vertex_F[0]*4);
            
            let index = vertex_F[id];
            let offset = offset_F[id];
            let valance = valance_F[id];

            var pos = vec3(0.0,0.0,0.0);

            for (var i=offset; i<offset+valance ; i++ ){
            pos.x = pos.x + ( baseVertex[pointIdx_F[i]*4]) / f32(valance);
            pos.y = pos.y + ( baseVertex[(pointIdx_F[i]*4)+1] / f32(valance));
            pos.z = pos.z + ( baseVertex[(pointIdx_F[i]*4)+2] / f32(valance));
            }

            baseVertex[start+id*4] = pos.x;
            baseVertex[start+id*4+1] = pos.y;
            baseVertex[start+id*4+2] = pos.z;
            baseVertex[start+id*4+3] = 0;
        }
        `
    });

    const module_Edge = device.createShaderModule({
        code: `
        @group(0) @binding(0) var<storage, read> vertex_E: array<i32>;
        @group(0) @binding(1) var<storage, read> pointIdx_E: array<i32>;
        @group(0) @binding(2) var<storage, read_write> baseVertex: array<f32>;

        @compute @workgroup_size(256) 
        fn compute_EdgePoint(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
            let id = global_invocation_id.x;
            let start2 = u32(vertex_E[0]*4);
            
            let index = vertex_E[id];
            let offset = 4*id;

            var pos = vec3(0.0,0.0,0.0);

            for (var i=offset; i<offset+4 ; i++ ){
            pos.x = pos.x + ( baseVertex[pointIdx_E[i]*4]) / 4;
            pos.y = pos.y + ( baseVertex[(pointIdx_E[i]*4)+1] ) / 4;
            pos.z = pos.z + ( baseVertex[(pointIdx_E[i]*4)+2] ) / 4;
            }

            baseVertex[start2+id*4] = pos.x;
            baseVertex[start2+id*4+1] = pos.y;
            baseVertex[start2+id*4+2] =pos.z;
            baseVertex[start2+id*4+3] = 0;
        }
        `
    });

    const module_Vertex = device.createShaderModule({
        code: `
        @group(0) @binding(0) var<storage, read> vertex_V: array<i32>;
        @group(0) @binding(1) var<storage, read> offset_V: array<i32>;
        @group(0) @binding(2) var<storage, read> valance_V: array<i32>;
        @group(0) @binding(3) var<storage, read> index_V: array<i32>;
        @group(0) @binding(4) var<storage, read> pointIdx_V: array<i32>;
        @group(0) @binding(5) var<storage, read_write> baseVertex: array<f32>;


        @compute @workgroup_size(256) 
        fn compute_VertexPoint(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
            let id = global_invocation_id.x;
            let start = u32(vertex_V[0]*4);
            
            let index = vertex_V[id];
            let oldIndex = index_V[id];
            let offset = offset_V[id];
            let valance = valance_V[id]/2;

            var pos = vec3(0.0,0.0,0.0);

            for (var i=offset; i<offset+(valance*2) ; i++ ){
            pos.x = pos.x + ( baseVertex[pointIdx_V[i]*4]) / (f32(valance)*f32(valance));
            pos.y = pos.y + ( baseVertex[(pointIdx_V[i]*4)+1] ) / (f32(valance)*f32(valance));
            pos.z = pos.z + ( baseVertex[(pointIdx_V[i]*4)+2] ) / (f32(valance)*f32(valance));
            }

            baseVertex[start+id*4] = (pos.x + (baseVertex[oldIndex*4] * (f32(valance-2)/f32(valance))));
            baseVertex[start+id*4+1] = pos.y + (baseVertex[oldIndex*4+1] * (f32(valance-2)/f32(valance)));
            baseVertex[start+id*4+2] = pos.z + (baseVertex[oldIndex*4+2] * (f32(valance-2)/f32(valance)));
            baseVertex[start+id*4+3] = 0;
        }
        `
    });
    /*for limit*/ 
    const module_Limit = device.createShaderModule({
        code: `
        @group(0) @binding(0) var<storage, read_write> baseVertex: array<f32>;
        @group(0) @binding(1) var<storage, read> limitData: array<i32>;


        @compute @workgroup_size(256) 
        fn compute_LimitPoint(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
        let id = global_invocation_id.x;
        let limitIdx= limitData[id*9];

        var limPos = vec3(baseVertex[4*limitIdx], baseVertex[4*limitIdx+1], baseVertex[4*limitIdx+2]);


        let edge_sum_X = baseVertex[4*limitData[id*9+1]] + baseVertex[4*limitData[id*9+3]] + baseVertex[4*limitData[id*9+5]] + baseVertex[4*limitData[id*9+7]];
        let edge_sum_Y = baseVertex[4*limitData[id*9+1]+1] + baseVertex[4*limitData[id*9+3]+1] + baseVertex[4*limitData[id*9+5]+1] + baseVertex[4*limitData[id*9+7]+1];
        let edge_sum_Z = baseVertex[4*limitData[id*9+1]+2] + baseVertex[4*limitData[id*9+3]+2] + baseVertex[4*limitData[id*9+5]+2] + baseVertex[4*limitData[id*9+7]+2];
        
        let face_sum_X = baseVertex[4*limitData[id*9+2]] + baseVertex[4*limitData[id*9+4]] + baseVertex[4*limitData[id*9+6]] + baseVertex[4*limitData[id*9+8]];
        let face_sum_Y = baseVertex[4*limitData[id*9+2]+1] + baseVertex[4*limitData[id*9+4]+1] + baseVertex[4*limitData[id*9+6]+1] + baseVertex[4*limitData[id*9+8]+1];
        let face_sum_Z = baseVertex[4*limitData[id*9+2]+2] + baseVertex[4*limitData[id*9+4]+2] + baseVertex[4*limitData[id*9+6]+2] + baseVertex[4*limitData[id*9+8]+2];

        baseVertex[limitIdx*4] = ((4*limPos.x) + edge_sum_X + (face_sum_X/4))/9;
        baseVertex[limitIdx*4+1] = ((4*limPos.y) + edge_sum_Y + (face_sum_Y/4))/9;
        baseVertex[limitIdx*4+2] = ((4*limPos.z) + edge_sum_Z + (face_sum_Z/4))/9;
        baseVertex[limitIdx*4+3] = 0;


        }
        `
    });

    const pipeline_Face = device.createComputePipeline({
        label: 'Face Point Compute Pipeline',
        layout: 'auto',
        compute: {
            module: module_Face,
            entryPoint: 'compute_FacePoint',
        },
    });

    const pipeline_Edge = device.createComputePipeline({
        label: 'Edge Point Compute Pipeline',
        layout: 'auto',
        compute: {
            module: module_Edge,
            entryPoint: 'compute_EdgePoint',
        },
    });

    const pipeline_Vertex = device.createComputePipeline({
        label: 'Vertex Point Compute Pipeline',
        layout: 'auto',
        compute: {
            module: module_Vertex,
            entryPoint: 'compute_VertexPoint',
        },
    });

    /*for Limit*/
    const pipeline_Limit = device.createComputePipeline({
        label: 'Limit Point Compute Pipeline',
        layout: 'auto',
        compute: {
            module: module_Limit,
            entryPoint: 'compute_LimitPoint',
        },
    });

    const module1 = device.createShaderModule({
        code: `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec3f,
            time: f32,
            wireAdjust: f32,
        };

        struct IndexVertex {
            @location(0) position : vec2f,
        };

        struct Vertex {
            position : vec4f,
        };

        struct Connectivity {
            index: i32,
        };

        struct Color {
            value: vec4f,
            zFighting: vec3f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
            @location(1) normal: vec3f,
            @location(2) center: vec3f,
            @location(3) adjust: f32,
        };

        @group(0) @binding(0) var<uniform> uni: Uniforms;
        @group(0) @binding(1) var<storage, read> pos2: array<Vertex>;
        @group(0) @binding(2) var<storage, read> texture: array<Vertex>;
        // @group(0) @binding(2) var u_earthbump1k: texture_2d<f32>;
        // @group(0) @binding(3) var sampler0: sampler;
        @group(1) @binding(0) var<storage, read> conn: array<Connectivity>;
        @group(1) @binding(1) var<storage, read> color: Color;

        fn B0(t: f32) -> f32 {
            return (1.0/6.0)*(1.0-t)*(1.0-t)*(1.0-t);
        }
        fn B0prime(t: f32) -> f32 {
            return (-1.0/2.0)*(1.0-t)*(1.0-t);
        }
        fn B1(t: f32) -> f32 {
            return (1.0/6.0)*(3.0*t*t*t - 6.0*t*t + 4.0);
        }
        fn B1prime(t: f32) -> f32 {
            return (1.0/6.0)*(9.0*t*t - 12.0*t);
        }
        fn B2(t: f32) -> f32 {
            return (1.0/6.0)*(-3.0*t*t*t + 3.0*t*t + 3.0*t + 1.0);
        }
        fn B2prime(t: f32) -> f32 {
            return (1.0/6.0)*(-9.0*t*t + 6.0*t + 3.0);
        }
        fn B3(t: f32) -> f32 {
            return (1.0/6.0)*t*t*t;
        }
        fn B3prime(t: f32) -> f32 {
            return (1.0/2.0)*t*t;
        }

        fn length(t: vec3f) -> f32 {
            return sqrt(pow(t.x, 2)+pow(t.y, 2)+pow(t.z, 2));
        }

        @vertex fn vs(
            @builtin(instance_index) instanceIndex: u32,
            @builtin(vertex_index) vertexIndex: u32,
            vert: IndexVertex
        ) -> VSOutput {
            var vsOut: VSOutput;

            let p =  B0(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 0].index  ].position.xyz
                    +B0(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 1].index  ].position.xyz
                    +B0(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 2].index  ].position.xyz
                    +B0(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 3].index  ].position.xyz
                    +B1(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 4].index  ].position.xyz
                    +B1(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 5].index  ].position.xyz
                    +B1(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 6].index  ].position.xyz
                    +B1(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 7].index  ].position.xyz
                    +B2(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 8].index  ].position.xyz
                    +B2(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 9].index  ].position.xyz
                    +B2(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+10].index  ].position.xyz
                    +B2(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+11].index  ].position.xyz
                    +B3(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+12].index  ].position.xyz
                    +B3(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+13].index  ].position.xyz
                    +B3(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+14].index  ].position.xyz
                    +B3(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+15].index  ].position.xyz;

            let tu = B0prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 0].index  ].position
                    +B0prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 1].index  ].position
                    +B0prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 2].index  ].position
                    +B0prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 3].index  ].position
                    +B1prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 4].index  ].position
                    +B1prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 5].index  ].position
                    +B1prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 6].index  ].position
                    +B1prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 7].index  ].position
                    +B2prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 8].index  ].position
                    +B2prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 9].index  ].position
                    +B2prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+10].index  ].position
                    +B2prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+11].index  ].position
                    +B3prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+12].index  ].position
                    +B3prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+13].index  ].position
                    +B3prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+14].index  ].position
                    +B3prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+15].index  ].position;

            let tv = B0(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 0].index  ].position
                    +B0(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 1].index  ].position
                    +B0(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 2].index  ].position
                    +B0(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 3].index  ].position
                    +B1(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 4].index  ].position
                    +B1(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 5].index  ].position
                    +B1(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 6].index  ].position
                    +B1(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 7].index  ].position
                    +B2(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 8].index  ].position
                    +B2(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 9].index  ].position
                    +B2(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+10].index  ].position
                    +B2(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+11].index  ].position
                    +B3(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+12].index  ].position
                    +B3(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+13].index  ].position
                    +B3(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+14].index  ].position
                    +B3(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+15].index  ].position;

            let imageWidth: f32 = 512;  // 예시 이미지 너비
            let imageHeight: f32 = 512;  // 예시 이미지 높이

            // 텍스처 좌표에 따라 이미지에서 변위 값을 샘플링
            let texCoord = vert.position; // Vertex 구조체에 texCoords가 있다고 가정
            let xIndex = i32(texCoord.x * imageWidth);
            let yIndex = i32(texCoord.y * imageHeight);
            let index = xIndex + yIndex * i32(imageWidth);
            let displacement = texture[index];  // 이미지 데이터에서 변위 값 조회

            // vsOut.position = uni.matrix * vec4f(p*5, 1-displacement.position.x*0.01);
            vsOut.position = uni.matrix * vec4f(p*5, 1);

            vsOut.center = vec3f(vert.position.xy, 0);

            let g0 = pos2[  conn[instanceIndex*16+ 5].index  ].position.xyz;
            let g1 = pos2[  conn[instanceIndex*16+ 6].index  ].position.xyz;
            let g2 = pos2[  conn[instanceIndex*16+ 9].index  ].position.xyz;
            let g3 = pos2[  conn[instanceIndex*16+10].index  ].position.xyz;

            // let uv = vec2<f32>(0.5, 0.5);
            // let temp = textureSample(u_earthbump1k, sampler0, uv);

            let normal = normalize(  cross(  (uni.matrix*tu).xyz, (uni.matrix*tv).xyz  )  );
            vsOut.normal = normal;
            let view = normalize(  -1*uni.view - p  );
            _ = color;
            // vsOut.color = vec4f( p, 1);
            vsOut.color = color.value;
            vsOut.color += color.value * vec4f(dot(view, normal)*0.5, dot(view, normal)*0.5, dot(view, normal)*0.5, 1)  ;
            if(dot(view, normal) > 0)
            {
                vsOut.color += vec4f((pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2), 1);
            }

            var wire = uni.wireAdjust;
            if(uni.wireAdjust == 1)
            {
                vsOut.color = vec4f(0, 0, 0, 0);
                wire = 1;
            }            
            vsOut.adjust = wire/(length(g1 - g0)+length(g3-g2)+length(g2 - g0)+length(g3-g1));
            return vsOut;
        }

        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            // return vsOut.color;
            
            // if(vsOut.normal.z < 0.0)
            // {
            //     discard;
            // }
            if(abs(vsOut.center.x - 0.5) > (0.5-vsOut.adjust) || abs(vsOut.center.y - 0.5) > (0.5-vsOut.adjust)) // 0.49 vsOut.adjust
            {
                return vec4f(0, 0, 0, 1);
            }
            return vsOut.color;
            // return vec4f(vsOut.center, 1);  
        }
        `,
    });

    const module2 = device.createShaderModule({
        code: `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec3f,
            time: f32,
            wireAdjust: f32,
        };

        struct Vertex {
            @location(0) position : vec4f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @group(0) @binding(0) var<uniform> uni: Uniforms;

        @vertex fn vs(
            vert: Vertex,
        ) -> VSOutput {
            var vsOut: VSOutput;
            
            let p = vert.position.xyz;

            // vsOut.position = uni.matrix * vec4f(p*250, 1);
            vsOut.position = uni.matrix * vec4f(p*5, 1);         
            return vsOut;
        }

        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            return vec4f(0.5, 0, 0, 1);
        }
        `,
    });

    const moduleAnime = device.createShaderModule({
        code: `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec3f,
            time: f32,
            wireAdjust: f32,
        };

        @group(0) @binding(0) var<uniform> uni: Uniforms;
        @group(0) @binding(1) var<storage, read_write> baseVertex: array<f32>;

        @compute @workgroup_size(256) fn cs(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
            let id = global_invocation_id.x;
            _ = uni.time;
            
            baseVertex[id*4+0] = baseVertex[id*4+0];
            // baseVertex[id*4+1] = sin(uni.time*f32(id)/10)+cos(uni.time*f32(id)/10) + (baseVertex[id*4+0] + baseVertex[id*4+2])/2;
            baseVertex[id*4+1] = baseVertex[id*4+1];
            baseVertex[id*4+2] = baseVertex[id*4+2];
            baseVertex[id*4+3] = 0;
        }
        `,
    });

    const pipeline_point_list = device.createRenderPipeline({
        label: 'pipeline_point_list',
        layout: 'auto',
        vertex: {
            module: module1,
            entryPoint: 'vs',
            buffers: [
                {
                    arrayStride: (2) * 4, // (2) floats, 4 bytes each
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ],
                },
            ],
        },
        fragment: {
            module: module1,
            entryPoint: 'fs',
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'point-list',
            listIndexFormat: 'uint32',
            // cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });
    const pipeline_line_list = device.createRenderPipeline({
        label: 'pipeline_line_list',
        layout: 'auto',
        vertex: {
            module: module1,
            entryPoint: 'vs',
            buffers: [
                {
                    arrayStride: (2) * 4, // (2) floats, 4 bytes each
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ],
                },
            ],
        },
        fragment: {
            module: module1,
            entryPoint: 'fs',
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'line-list',
            listIndexFormat: 'uint32',
            // cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });
    const pipeline_face_list = device.createRenderPipeline({
        label: 'pipeline_face_list',
        layout: 'auto',
        vertex: {
            module: module1,
            entryPoint: 'vs',
            buffers: [
                {
                    arrayStride: (2) * 4, // (2) floats, 4 bytes each
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ],
                },
            ],
        },
        fragment: {
            module: module1,
            entryPoint: 'fs',
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            // topology: 'point-list',
            listIndexFormat: 'uint32',
            // cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const pipelines = [];
    pipelines.push(pipeline_point_list); pipelines.push(pipeline_line_list); pipelines.push(pipeline_face_list);

    const pipeline2 = device.createRenderPipeline({
        label: 'pipeline2',
        layout: 'auto',
        vertex: {
            module: module2,
            entryPoint: 'vs',
            buffers: [
                {
                    arrayStride: (4) * 4, // (4) floats, 4 bytes each
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x4' },  // position
                    ],
                },
            ],
        },
        fragment: {
            module: module2,
            entryPoint: 'fs',
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            // topology: 'line-list',
            listIndexFormat: 'uint32',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const pipelineAnime = device.createComputePipeline({
        label: 'Animation! Compute Pipeline',
        layout: 'auto',
        compute: {
            module: moduleAnime,
            entryPoint: 'cs',
        },
    });

    const xyzModule = device.createShaderModule({
        label: 'xyz module',
        code: `
            struct OurVertexShaderOutput {
                @builtin(position) position: vec4f,
                @location(0) color: vec4f,
            };

            struct Uniforms {
                matrix: mat4x4f,
            };

            @group(0) @binding(0) var<uniform> uni: Uniforms;

            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> OurVertexShaderOutput {
                let pos = array(
                // x축
                vec3f( -1.0,  0.0,  0.0 ),  
                vec3f(  1.0,  0.0,  0.0 ),
                // y축
                vec3f(  0.0, -1.0,  0.0 ),  
                vec3f(  0.0,  1.0,  0.0 ),
                // z축
                vec3f(  0.0,  0.0, -1.0 ),  
                vec3f(  0.0,  0.0,  1.0 ),
                );
                let color = array(
                vec4f(1, 0, 0, 1),
                vec4f(0, 1, 0, 1),
                vec4f(0, 0, 1, 1),
                );

                _ = uni;

                var vsOutput: OurVertexShaderOutput;
                let xyz = pos[vertexIndex];
                vsOutput.position = uni.matrix * vec4f(xyz*100, 1.0);
                vsOutput.color = color[vertexIndex/2];
                return vsOutput;
            }

            @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
                return fsInput.color;
            }
        `,
    });

    const xyzPipeline = device.createRenderPipeline({
        label: 'hardcoded textured quad pipeline',
        layout: 'auto',
        vertex: {
          module: xyzModule,
          entry: 'vs',
        },
        fragment: {
          module: xyzModule,
          entry: 'fs',
          targets: [{ format: presentationFormat }],
        },
        primitive: {
          topology: 'line-list',
          listIndexFormat: 'uint32',
          // cullMode: 'back',
        },
    });

    return { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipelines, pipeline2, pipelineAnime, xyzPipeline, pipeline_Limit};
}