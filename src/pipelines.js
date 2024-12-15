export async function createPipelines(device, presentationFormat) {

    const module_Face = device.createShaderModule({
        code: /*wgsl*/ `
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
        code: /*wgsl*/ `
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
        code: /*wgsl*/ `
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
        code: /*wgsl*/ `
        @group(0) @binding(0) var<storage, read_write> baseVertex: array<f32>;
        @group(0) @binding(1) var<storage, read_write> limitData: array<i32>;
        @group(0) @binding(2) var<storage, read_write> baseNormal: array<vec4f>;


        @compute @workgroup_size(256)
        fn compute_LimitPoint(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
            let id = global_invocation_id.x;
            let limitIdx= limitData[id*9];

            var limPos = vec3(baseVertex[4*limitIdx], baseVertex[4*limitIdx+1], baseVertex[4*limitIdx+2]);

            let e0 = vec3(baseVertex[4*limitData[id*9+1]],baseVertex[4*limitData[id*9+1]+1],baseVertex[4*limitData[id*9+1]+2]);
            let e1 = vec3(baseVertex[4*limitData[id*9+3]],baseVertex[4*limitData[id*9+3]+1],baseVertex[4*limitData[id*9+3]+2]);
            let e2 = vec3(baseVertex[4*limitData[id*9+5]],baseVertex[4*limitData[id*9+5]+1],baseVertex[4*limitData[id*9+5]+2]);
            let e3 = vec3(baseVertex[4*limitData[id*9+7]],baseVertex[4*limitData[id*9+7]+1],baseVertex[4*limitData[id*9+7]+2]);


            let f0 = vec3(baseVertex[4*limitData[id*9+2]],baseVertex[4*limitData[id*9+2]+1],baseVertex[4*limitData[id*9+2]+2]);
            let f1 = vec3(baseVertex[4*limitData[id*9+4]],baseVertex[4*limitData[id*9+4]+1],baseVertex[4*limitData[id*9+4]+2]);
            let f2 = vec3(baseVertex[4*limitData[id*9+6]],baseVertex[4*limitData[id*9+6]+1],baseVertex[4*limitData[id*9+6]+2]);
            let f3 = vec3(baseVertex[4*limitData[id*9+8]],baseVertex[4*limitData[id*9+8]+1],baseVertex[4*limitData[id*9+8]+2]);

            let edge_sum = e0+e1+e2+e3;
            let face_sum = f0+f1+f2+f3;

            let c2 = 4*(e0-e2)+f0-f1-f2+f3;
            let c3 = 4*(e1-e3)+f1-f2-f3+f0;
            let normal = normalize(cross(c2,c3));

            baseVertex[limitIdx*4] = ((16*limPos.x) + 4*edge_sum.x + (face_sum.x))/36;
            baseVertex[limitIdx*4+1] = ((16*limPos.y) + 4*edge_sum.y + (face_sum.y))/36;
            baseVertex[limitIdx*4+2] = ((16*limPos.z) + 4*edge_sum.z + (face_sum.z))/36;
            baseVertex[limitIdx*4+3] = 0;

            baseNormal[limitIdx] = vec4f(normal, 0);
            baseNormal[0] = vec4f(0, 0, 0, 0);
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
        code: /*wgsl*/ `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec4f,
            time: vec4f,
            wireAdjust: vec4f,
            displacementValue: vec4f,
            color: vec4f,
        };

        struct tex {
            tex: vec2f,
        };

        struct IndexVertex {
            @location(0) position : vec2f,
        };

        struct Vertex {
            position : vec4f,
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
            @location(4) texcoord: vec2f,
            @location(5) texcoord1: vec2f,
            @location(6) position2: vec3f,
        };

        @group(0) @binding(0) var<uniform> uni: Uniforms;
        @group(0) @binding(1) var<storage, read> pos2: array<vec4f>;
        @group(0) @binding(2) var<storage, read> base_normal: array<vec4f>;
        @group(0) @binding(3) var object_texture: texture_2d<f32>;
        @group(0) @binding(4) var sampler0: sampler;
        @group(0) @binding(5) var<storage> textureBuffer: array<f32>;
        @group(1) @binding(0) var<storage, read> conn: array<i32>;
        @group(1) @binding(1) var<storage, read> base_UV: array<vec2f>;
        @group(1) @binding(2) var<storage, read> color: Color;

        // fn B0(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*(s*s*s);
        // }
        // fn B0prime(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*(-s*s);
        // }
        // fn B1(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*( (4.0*s*s*s + t*t*t) + (12.0*s*t*s + 6.0*t*s*t) );
        // }
        // fn B1prime(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*( -t*t -4.0*t*s );
        // }
        // fn B2(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*( (4.0*t*t*t + s*s*s) + (12.0*t*s*t + 6.0*s*t*s) );
        // }
        // fn B2prime(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*( s*s + 4.0*s*t );
        // }
        // fn B3(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*(t*t*t);
        // }
        // fn B3prime(t: f32) -> f32 {
        //     var s = 1 - t;
        //     return (1.0/6.0)*t*t;
        // }

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

        fn makeuv(uv: vec2f) -> vec2f {
            return vec2f(uv.x, 1-uv.y);
        }

        fn uvLinearInter(t: f32, uv1: vec2f, uv2: vec2f) -> vec2f {
            var uv: vec2f = (1-t)*uv1 + t*uv2;
            return makeuv(uv);
        }
        
        fn getTexture(texture: texture_2d<f32>, sampler: sampler, uv: vec2f, level: f32) -> vec4f {
            return textureSampleLevel(texture, sampler, uv, 0);
            // return textureLoad(texture, vec2i(uv*511), i32(0));
        }

        fn Sum_of_4value(a: f32, b:f32, c:f32, d:f32) -> f32 {
            // return max(max(a, b), max(c, d));
            return (a + b + c + d) / 4;
        }

        fn Sum_of_2value(a: f32, b:f32) -> f32 {
            // return max(a, b);
            return (a + b) / 2;
        }

        @vertex fn vs(
            @builtin(instance_index) instanceIndex: u32,
            @builtin(vertex_index) vertexIndex: u32,
            vert: IndexVertex
        ) -> VSOutput {
            var vsOut: VSOutput;

            let p =  B0(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 0]  ].xyz
                    +B0(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 1]  ].xyz
                    +B0(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 2]  ].xyz
                    +B0(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 3]  ].xyz
                    +B1(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 4]  ].xyz
                    +B1(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 5]  ].xyz
                    +B1(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 6]  ].xyz
                    +B1(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 7]  ].xyz
                    +B2(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 8]  ].xyz
                    +B2(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 9]  ].xyz
                    +B2(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+10]  ].xyz
                    +B2(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+11]  ].xyz
                    +B3(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+12]  ].xyz
                    +B3(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+13]  ].xyz
                    +B3(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+14]  ].xyz
                    +B3(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+15]  ].xyz;

            let tu = B0prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 0]  ]
                    +B0prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 1]  ]
                    +B0prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 2]  ]
                    +B0prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 3]  ]
                    +B1prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 4]  ]
                    +B1prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 5]  ]
                    +B1prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+ 6]  ]
                    +B1prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+ 7]  ]
                    +B2prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+ 8]  ]
                    +B2prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+ 9]  ]
                    +B2prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+10]  ]
                    +B2prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+11]  ]
                    +B3prime(vert.position.x)*B0(vert.position.y)*pos2[  conn[instanceIndex*16+12]  ]
                    +B3prime(vert.position.x)*B1(vert.position.y)*pos2[  conn[instanceIndex*16+13]  ]
                    +B3prime(vert.position.x)*B2(vert.position.y)*pos2[  conn[instanceIndex*16+14]  ]
                    +B3prime(vert.position.x)*B3(vert.position.y)*pos2[  conn[instanceIndex*16+15]  ];

            let tv = B0(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 0]  ]
                    +B0(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 1]  ]
                    +B0(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 2]  ]
                    +B0(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 3]  ]
                    +B1(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 4]  ]
                    +B1(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 5]  ]
                    +B1(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 6]  ]
                    +B1(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 7]  ]
                    +B2(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 8]  ]
                    +B2(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+ 9]  ]
                    +B2(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+10]  ]
                    +B2(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+11]  ]
                    +B3(vert.position.x)*B0prime(vert.position.y)*pos2[  conn[instanceIndex*16+12]  ]
                    +B3(vert.position.x)*B1prime(vert.position.y)*pos2[  conn[instanceIndex*16+13]  ]
                    +B3(vert.position.x)*B2prime(vert.position.y)*pos2[  conn[instanceIndex*16+14]  ]
                    +B3(vert.position.x)*B3prime(vert.position.y)*pos2[  conn[instanceIndex*16+15]  ];

            var normal = normalize(  cross(  (tu).xyz, (tv).xyz  )  );

            _ = sampler0;
            _ = base_UV[ instanceIndex ];
            _ = textureBuffer[ instanceIndex ];
            _ = object_texture;
            _ = base_normal[0];


            let patchImageHighX = vec2f(   vert.position.y *base_UV[  instanceIndex*16+4  ])
                                + vec2f((1-vert.position.y)*base_UV[  instanceIndex*16+0  ]);
            let patchImageLowX  = vec2f(   vert.position.y *base_UV[  instanceIndex*16+12 ])
                                + vec2f((1-vert.position.y)*base_UV[  instanceIndex*16+8  ]);

            let uv              = vec2f(   vert.position.x *patchImageLowX)
                                + vec2f((1-vert.position.x)*patchImageHighX);
            
            let texCoordInt = vec2i(  i32(uv.x),  i32((1-uv.y))  );

            var textureValue: f32;

            if(vert.position.x == 0.0 && vert.position.y == 0.0) // changed
            {
                textureValue = Sum_of_4value(
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 0]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 1]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 2]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 3]), 0).x,
                );

                if(base_normal[  conn[instanceIndex*16+5]  ].x != 0)
                {
                    normal = -base_normal[  conn[instanceIndex*16+5]  ].xyz;
                }

                // textureValue = (base_UV[instanceIndex*16 +0].y
                //             +   base_UV[instanceIndex*16 +1].y
                //             +   base_UV[instanceIndex*16 +2].y
                //             +   base_UV[instanceIndex*16 +3].y ) / 4;
            }

            else if(vert.position.x == 0.0 && vert.position.y == 1.0) // changed
            {
                textureValue = Sum_of_4value(
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 4]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 5]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 6]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 7]), 0).x,
                );

                if(base_normal[  conn[instanceIndex*16+6]  ].x != 0)
                {
                    normal = -base_normal[  conn[instanceIndex*16+6]  ].xyz;
                }

                // textureValue = (base_UV[instanceIndex*16 +4].y
                //             +   base_UV[instanceIndex*16 +5].y
                //             +   base_UV[instanceIndex*16 +6].y
                //             +   base_UV[instanceIndex*16 +7].y ) / 4;
            }

            else if(vert.position.x == 1.0 && vert.position.y == 0.0) // changed
            {
                textureValue = Sum_of_4value(
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 8]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 + 9]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 +10]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 +11]), 0).x,
                );

                if(base_normal[  conn[instanceIndex*16+9]  ].x != 0)
                {
                    normal = -base_normal[  conn[instanceIndex*16+9]  ].xyz;
                }

                // textureValue = (base_UV[instanceIndex*16 +8].y
                //             +   base_UV[instanceIndex*16 +9].y
                //             +   base_UV[instanceIndex*16 +10].y
                //             +   base_UV[instanceIndex*16 +11].y ) / 4;
            }

            else if(vert.position.x == 1.0 && vert.position.y == 1.0) // changed
            {
                textureValue = Sum_of_4value(
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 +12]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 +13]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 +14]), 0).x,
                    getTexture(object_texture, sampler0, makeuv(base_UV[instanceIndex*16 +15]), 0).x,
                );

                if(base_normal[  conn[instanceIndex*16+10]  ].x != 0)
                {
                    normal = -base_normal[  conn[instanceIndex*16+10]  ].xyz;
                }

                // textureValue = (base_UV[instanceIndex*16 +12].y
                //             +   base_UV[instanceIndex*16 +13].y
                //             +   base_UV[instanceIndex*16 +14].y
                //             +   base_UV[instanceIndex*16 +15].y ) / 4;
            }
    
            else if(vert.position.y == 0.0) // changed
            {
                textureValue = Sum_of_2value(
                    getTexture(object_texture, sampler0,uvLinearInter(
                        vert.position.x, base_UV[instanceIndex*16 +  0], base_UV[instanceIndex*16 +  8]
                    ), 0).x,
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.x, base_UV[instanceIndex*16 +  1], base_UV[instanceIndex*16 +  11]
                    ), 0).x,
                );

                // textureValue =((   (1-vert.position.x) * base_UV[instanceIndex*16 +  0] + vert.position.x * base_UV[instanceIndex*16 + 8] ).y
                //             +  (   (1-vert.position.x) * base_UV[instanceIndex*16 +  1] + vert.position.x * base_UV[instanceIndex*16 + 11] ).y) / 2;
            }
            else if(vert.position.y == 1.0) // changed
            {
                textureValue = Sum_of_2value(
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.x, base_UV[instanceIndex*16 +  4], base_UV[instanceIndex*16 +  12]
                    ), 0).x,
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.x, base_UV[instanceIndex*16 +  7], base_UV[instanceIndex*16 +  13]
                    ), 0).x
                );

                // textureValue =((   (1-vert.position.x) * base_UV[instanceIndex*16 +  4] + vert.position.x * base_UV[instanceIndex*16 + 12] ).y
                //             +  (   (1-vert.position.x) * base_UV[instanceIndex*16 +  7] + vert.position.x * base_UV[instanceIndex*16 + 13] ).y) / 2;
            }
            else if(vert.position.x == 0.0) // changed
            {
                textureValue = Sum_of_2value(
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.y, base_UV[instanceIndex*16 +  0], base_UV[instanceIndex*16 +  4]
                    ), 0).x,
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.y, base_UV[instanceIndex*16 +  3], base_UV[instanceIndex*16 +  5]
                    ), 0).x
                );

                // textureValue =((   (1-vert.position.y) * base_UV[instanceIndex*16 +  0] + vert.position.y * base_UV[instanceIndex*16 + 4] ).y
                //             +  (   (1-vert.position.y) * base_UV[instanceIndex*16 +  3] + vert.position.y * base_UV[instanceIndex*16 + 5] ).y) / 2;
            }
            else if(vert.position.x == 1.0) // changed
            {
                textureValue = Sum_of_2value(
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.y, base_UV[instanceIndex*16 +  8], base_UV[instanceIndex*16 +  12]
                    ), 0).x,
                    getTexture(object_texture, sampler0, uvLinearInter(
                        vert.position.y, base_UV[instanceIndex*16 +  9], base_UV[instanceIndex*16 +  15]
                    ), 0).x
                );

                // textureValue =((   (1-vert.position.y) * base_UV[instanceIndex*16 +  8] + vert.position.y * base_UV[instanceIndex*16 + 12] ).y
                //             +  (   (1-vert.position.y) * base_UV[instanceIndex*16 +  9] + vert.position.y * base_UV[instanceIndex*16 + 15] ).y) / 2;
            }

            else
            {
                // textureValue = textureSampleLevel(object_texture, sampler0,texCoordInt, 0).x;
                // textureValue = textureSample(object_texture, sampler0,sampler0, vec2f(uv.x, 1-uv.y)).x;
                textureValue = getTexture(object_texture, sampler0, vec2f(uv.x, 1-uv.y), 0).x;
                // textureValue = uv.y;
            }

            // let textureValue = f32(round(80*(pow(20, textureSampleLevel(object_texture, sampler0,texCoordInt, 0).x - 0.5)/4.5)))/80.0; // textureSampleLevel 뽑아내면 될듯

            // vsOut.position = uni.matrix * vec4f(p*5, 1);
            if(textureValue-0.5 < 0)
            {
                vsOut.position = uni.matrix * vec4f(p*5, 1);
            }
            else
            {
                vsOut.position = uni.matrix * vec4f(p*5 + normal*(textureValue-0.5)*uni.displacementValue.x, 1);
                // vsOut.position = uni.matrix * vec4f(p*5 + normal*20, 1);
                // vsOut.position = uni.matrix * vec4f(p*5 + textureValue*20, 1);
            }
            // vsOut.position = uni.matrix * vec4f(p*5 + textureValue*20, 1);
            // vsOut.position = uni.matrix * vec4f(p*5 + normal*2, 1);

            // vsOut.position = uni.matrix * vec4f(p*5 + normal*(textureValue)*uni.displacementValue.x, 1);

            vsOut.center = vec3f(vert.position.xy, 0);
            vsOut.position2 = vec3f(normalize(p.xyz));
            vsOut.normal = normal;
            vsOut.texcoord = vec2f(uv.x, 1-uv.y);
            vsOut.texcoord1 = vec2f(textureValue, 0);

            let g0 = pos2[  conn[instanceIndex*16+ 5]  ].xyz;
            let g1 = pos2[  conn[instanceIndex*16+ 6]  ].xyz;
            let g2 = pos2[  conn[instanceIndex*16+ 9]  ].xyz;
            let g3 = pos2[  conn[instanceIndex*16+10]  ].xyz;
            let view = normalize(  uni.view.xyz - p  );
            let temp_light = dot(view, normal)*0.5;
            vsOut.color = color.value;
            vsOut.color += color.value * vec4f(temp_light, temp_light, temp_light, 1)  ;
            vsOut.position2 += vec3f(normalize(p.xyz)) * vec3f(temp_light, temp_light, temp_light)  ;
            if(dot(view, normal) > 0)
            {
                let highlight = vec3f((pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2));
                vsOut.color += vec4f(highlight, 1);
                vsOut.position2 += highlight;
            }

            var wire = uni.wireAdjust.x;
            if(uni.wireAdjust.x == 1)
            {
                vsOut.color = vec4f(0, 0, 0, 0);
                wire = 1;
            }
            vsOut.adjust = wire/(length(g1 - g0)+length(g3-g2)+length(g2 - g0)+length(g3-g1));
            return vsOut;
        }

        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            if(abs(vsOut.center.x - 0.5) > (0.5-vsOut.adjust) || abs(vsOut.center.y - 0.5) > (0.5-vsOut.adjust)) // 0.49 vsOut.adjust
            {
                return vec4f(1, 0, 0, 1);
            }
            // let temp = textureSample(object_texture, sampler0,sampler0, vsOut.texcoord); // textureSampleLevel 뽑아내면 될듯
            // if(vsOut.normal.z < 0.0)
            // {
            //     discard;
            // }
            
            if(uni.color.x == 0) { return vec4f(vsOut.position2.xyz, 1); }
            else if(uni.color.x == 1) { return vec4f(vsOut.normal, 1); }
            else if(uni.color.x == 4) { return vec4f(vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, 1); }
            // return vec4f(temp.xyz*5 - 2.5, 1);
            // return vec4f(vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, 1);
            else { return vec4f(vsOut.color); }
        }
        `,
    });



    // extra



    const module2 = device.createShaderModule({
        code: /*wgsl*/ `
        struct Uniforms {
            matrix: mat4x4f,
            view: vec4f,
            time: vec4f,
            wireAdjust: vec4f,
            displacementValue: vec4f,
            color: vec4f,
        };

        struct Vertex {
            @location(0) position : vec4f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
            @location(1) normal: vec3f,
            @location(2) position2: vec3f,
            @location(3) texcoord: vec2f,
            @location(4) texcoord1: vec2f,
        };

        fn getTexture(texture: texture_2d<f32>, sampler: sampler, uv: vec2f, level: f32) -> vec4f
        {
            return textureSampleLevel(texture, sampler, uv, level);
            // return textureLoad(texture, vec2i(uv*511), i32(level));
        }

        @group(0) @binding(0) var<uniform> uni: Uniforms;
        @group(0) @binding(1) var<storage, read> extra_index_storage_buffer: array<u32>;
        @group(0) @binding(2) var<storage, read> extra_base_UV: array<vec2f>;
        @group(0) @binding(3) var<storage, read> extra_vertex_offset: array<i32>;
        @group(0) @binding(4) var object_texture: texture_2d<f32>;
        @group(0) @binding(5) var sampler0: sampler;
        @group(0) @binding(6) var<storage, read> base_vertex: array<vec4f>;
        @group(0) @binding(7) var<storage, read> base_normal: array<vec4f>;

        @vertex fn vs(
            @builtin(instance_index) instanceIndex: u32,
            @builtin(vertex_index) vertexIndex: u32,
            vert: Vertex,
        ) -> VSOutput {
            var vsOut: VSOutput;

            _ = base_normal[0].x;
            _ = extra_base_UV[0].x;
            _ = object_texture;
            _ = sampler0;
            _ = extra_index_storage_buffer[0];
            _ = base_vertex[0].x;
            _ = uni.matrix[0];
            _ = extra_vertex_offset[0];

            let index = extra_vertex_offset[vertexIndex];
            let vertex_count = extra_vertex_offset[vertexIndex+1] - extra_vertex_offset[vertexIndex];

            var sum: f32 = 0.0;
            for(var i=0; i<vertex_count; i++)
            {
                sum = sum + getTexture(object_texture, sampler0, vec2f(extra_base_UV[index+i].x, (1-extra_base_UV[index+i].y)), 0).x;
            }
            let textureValue = sum / f32(vertex_count);
            
            let uv = extra_base_UV[vertexIndex];
            vsOut.texcoord = vec2f(uv.x, 1-uv.y);
            vsOut.texcoord1 = vec2f(textureValue, 0);
            let texCoordInt = vec2i(  i32(uv.x),  i32((1-uv.y))  );

            // let p = vert.position.xyz;
            let p = vec3f(base_vertex[extra_index_storage_buffer[vertexIndex]].xyz);
            var normal = -base_normal[extra_index_storage_buffer[vertexIndex]].xyz;
            // if(normal.x == 0)
            // {
            //     normal = vec3f(normalize(p.xyz));
            // }
            
            // vsOut.position = uni.matrix * vec4f(p*5, 1);
            if(textureValue-0.5 < 0)
            {
                vsOut.position = uni.matrix * vec4f(p*5, 1);
            }
            else
            {
                vsOut.position = uni.matrix * vec4f(p*5 + normal*(textureValue-0.5)*uni.displacementValue.x, 1);
                // vsOut.position = uni.matrix * vec4f(p*5 - normal*20, 1);
                // vsOut.position = uni.matrix * vec4f(p*5 + textureValue*20, 1);
            }

            vsOut.position2 = vec3f(normalize(p.xyz));
            vsOut.normal = normal;
            vsOut.color = vec4f(0.5, 0, 0, 1);
            let view = normalize(  uni.view.xyz - p  );
            let temp_light = dot(view, normal)*0.5;
            vsOut.color += vec4f(0.5, 0, 0, 1) * vec4f(temp_light, temp_light, temp_light, 1)  ;
            vsOut.position2 += vec3f(normalize(p.xyz)) * temp_light  ;
            if(dot(view, normal) > 0)
            {
                let highlight = vec3f((pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2), (pow(dot(view, normal), 100)*0.2));
                vsOut.color += vec4f(highlight, 1);
                vsOut.position2 += highlight;
            }
            return vsOut;
        }

        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            // let temp = textureSample(object_texture, sampler0, vsOut.texcoord); // textureSampleLevel 뽑아내면 될듯
            // return vec4f(temp.xyz*5 - 2.5, 1);
            // return vec4f(vsOut.texcoord, 0, 1);
            // return vec4f(0.5, 0, 0, 1);
            // return vsOut.color;
            // return vec4f(vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, 1);
            
            if(uni.color.x == 0) { return vec4f(vsOut.position2.xyz, 1); }
            else if(uni.color.x == 1) { return vec4f(normalize(vsOut.normal.xyz), 1); }
            else if(uni.color.x == 4) { return vec4f(vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, vsOut.texcoord1.x*5 -2.5, 1); }
            else { return vsOut.color; }
        }
        `,
    });

    const moduleAnime = device.createShaderModule({
        code: /*wgsl*/ `
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
    
    return { pipeline_Face, pipeline_Edge, pipeline_Vertex, 
            pipelines, pipeline2, pipelineAnime, pipeline_Limit };
}
