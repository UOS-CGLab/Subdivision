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

    const module1 = device.createShaderModule({
        code: `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec3f,
            time: vec4f,
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
        };

        @group(0) @binding(0) var<uniform> uni: Uniforms;
        @group(0) @binding(1) var<storage, read> pos2: array<Vertex>;
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

            vsOut.position = uni.matrix * vec4f(p*5, 1);

            let normal = normalize(  cross(  (uni.matrix*tu).xyz, (uni.matrix*tv).xyz  )  );
            vsOut.normal = normal;
            let view = normalize(  -1*uni.view - p  );
            // vsOut.color = vec4f( p, 1);
            vsOut.color = color.value;
            vsOut.color += color.value * vec4f(dot(view, normal)*0.5, dot(view, normal)*0.5, dot(view, normal)*0.5, 1)  ;
            if(dot(view, normal) > 0)
            {
            vsOut.color += vec4f((pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2), 1);
            }
            return vsOut;
        }

        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            // return vsOut.color;
            
            if(vsOut.normal.z < 0.0)
            {
            discard;
            }
            return vsOut.color;
        }
        `,
    });

    const module2 = device.createShaderModule({
        code: `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec4f,
            time: vec4f,
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
            vsOut.position = uni.matrix * vec4f(p*(1-0.0005*50)*5, 1);                  
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
            time: vec4f,
        };

        @group(0) @binding(0) var<uniform> uni: Uniforms;
        @group(0) @binding(1) var<storage, read_write> baseVertex: array<f32>;

        @compute @workgroup_size(256) fn cs(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
            let id = global_invocation_id.x;
            _ = uni.time[0];
            
            baseVertex[id*4+0] = baseVertex[id*4+0];
            // baseVertex[id*4+1] = sin(uni.time[0]*f32(id)/100)+cos(uni.time[0]*f32(id)/100) + (baseVertex[id*4+0] + baseVertex[id*4+2])/2;
            baseVertex[id*4+1] = baseVertex[id*4+1];
            // baseVertex[id*4+1] = (baseVertex[id*4+0] + baseVertex[id*4+2])/2
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

    return { pipeline_Face, pipeline_Edge, pipeline_Vertex, pipelines, pipeline2, pipelineAnime };
}
