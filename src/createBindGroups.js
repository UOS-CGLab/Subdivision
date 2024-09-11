import {createFVertices} from './createFVertices.js';

export function createBufferData(device, obj, level, limit) {
    const vertex_F = new Int32Array(obj[level].data.f_indices);
    const offset_F = new Int32Array(obj[level].data.f_offsets);
    const valance_F = new Int32Array(obj[level].data.f_valances);
    const pointIdx_F = new Int32Array(obj[level].data.f_data);

    const vertex_E = new Int32Array(obj[level].data.e_indices);
    const pointIdx_E = new Int32Array(obj[level].data.e_data);

    const vertex_V = new Int32Array(obj[level].data.v_indices);
    const offset_V = new Int32Array(obj[level].data.v_offsets);
    const valance_V = new Int32Array(obj[level].data.v_valances);
    const index_V = new Int32Array(obj[level].data.v_index);
    const pointIdx_V = new Int32Array(obj[level].data.v_data);

    const size = vertex_F.byteLength*4 + vertex_E.byteLength*4 + vertex_V.byteLength*4;

    // Create buffers for face, edge, and vertex data
    const vertex_Buffer_F = device.createBuffer({size: vertex_F.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const offset_Buffer_F = device.createBuffer({size: offset_F.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const valance_Buffer_F = device.createBuffer({size: valance_F.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const pointIdx_Buffer_F = device.createBuffer({size: pointIdx_F.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});

    const vertex_Buffer_E = device.createBuffer({size: vertex_E.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const pointIdx_Buffer_E = device.createBuffer({size: pointIdx_E.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});

    const vertex_Buffer_V = device.createBuffer({size: vertex_V.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const offset_Buffer_V = device.createBuffer({size: offset_V.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const valance_Buffer_V = device.createBuffer({size: valance_V.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const index_Buffer_V = device.createBuffer({size: index_V.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const pointIdx_Buffer_V = device.createBuffer({size: pointIdx_V.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});

    // Write data to buffers
    device.queue.writeBuffer(vertex_Buffer_F, 0, vertex_F);
    device.queue.writeBuffer(offset_Buffer_F, 0, offset_F);
    device.queue.writeBuffer(valance_Buffer_F, 0, valance_F);
    device.queue.writeBuffer(pointIdx_Buffer_F, 0, pointIdx_F);

    device.queue.writeBuffer(vertex_Buffer_E, 0, vertex_E);
    device.queue.writeBuffer(pointIdx_Buffer_E, 0, pointIdx_E);

    device.queue.writeBuffer(vertex_Buffer_V, 0, vertex_V);
    device.queue.writeBuffer(offset_Buffer_V, 0, offset_V);
    device.queue.writeBuffer(valance_Buffer_V, 0, valance_V);
    device.queue.writeBuffer(index_Buffer_V, 0, index_V);
    device.queue.writeBuffer(pointIdx_Buffer_V, 0, pointIdx_V);

    return {
        vertex_Buffer_F,
        offset_Buffer_F,
        valance_Buffer_F,
        pointIdx_Buffer_F,
        vertex_Buffer_E,
        pointIdx_Buffer_E,
        vertex_Buffer_V,
        offset_Buffer_V,
        valance_Buffer_V,
        index_Buffer_V,
        pointIdx_Buffer_V,
        size,
    };
}

export function createBindGroup(device, pipeline_Face, pipeline_Edge, pipeline_Vertex, Base_Vertex_Buffer, buffers, prefix) {
    const bindGroup_Face = device.createBindGroup({
        label: `bindGroup for face${prefix}`,
        layout: pipeline_Face.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: {buffer: buffers.vertex_Buffer_F}},
            {binding: 1, resource: {buffer: buffers.offset_Buffer_F}},
            {binding: 2, resource: {buffer: buffers.valance_Buffer_F}},
            {binding: 3, resource: {buffer: buffers.pointIdx_Buffer_F}},
            {binding: 4, resource: {buffer: Base_Vertex_Buffer}}
        ],
    });

    const bindGroup_Edge = device.createBindGroup({
        label: `bindGroup for Edge${prefix}`,
        layout: pipeline_Edge.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: {buffer: buffers.vertex_Buffer_E}},
            {binding: 1, resource: {buffer: buffers.pointIdx_Buffer_E}},
            {binding: 2, resource: {buffer: Base_Vertex_Buffer}}
        ],
    });

    const bindGroup_Vertex = device.createBindGroup({
        label: `bindGroup for vertex${prefix}`,
        layout: pipeline_Vertex.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: {buffer: buffers.vertex_Buffer_V}},
            {binding: 1, resource: {buffer: buffers.offset_Buffer_V}},
            {binding: 2, resource: {buffer: buffers.valance_Buffer_V}},
            {binding: 3, resource: {buffer: buffers.index_Buffer_V}},
            {binding: 4, resource: {buffer: buffers.pointIdx_Buffer_V}},
            {binding: 5, resource: {buffer: Base_Vertex_Buffer}}
        ],
    });

    return {
        bindGroup_Face,
        bindGroup_Edge,
        bindGroup_Vertex
    };
}



export async function changedBindGroup(device, uniformBuffer, Base_Vertex_Buffer, Base_Normal_Buffer, displacementBuffer, texture, sampler, 
    connectivityStorageBuffers, base_UVStorageBuffers, OrdinaryPointData, extra_base_UVStorageBuffers, 
    pipelines, pipeline2, pipelineAnime, depth, settings)
{
    const color0 = new Float32Array([0.5, 0.5, 0.5, 1, 0, 0, 0, 0]);
    const color1 = new Float32Array([1, 0.5, 0.5, 1, 0.0001, 0.0001, 0.0001, 0]);
    const color2 = new Float32Array([1, 1, 0, 1, 0.0002, 0.0002, 0.00002, 0]);
    const color3 = new Float32Array([0, 1, 0, 1, 0.0003, 0.0003, 0.0003, 0]);
    const color4 = new Float32Array([0, 0, 1, 1, 0.0004, 0.0004, 0.0004, 0]);
    const color5 = new Float32Array([1, 0, 1, 1, 0.0005, 0.0005, 0.0005, 0]);
    const color6 = new Float32Array([0, 1, 1, 1, 0.0006, 0.0006, 0.0006, 0]);
    const color7 = new Float32Array([1, 1, 1, 1, 0.0007, 0.0007, 0.0007, 0]);

    const colors = [color0, color1, color2, color3, color4, color5, color6, color7];

    let colorStorageBuffers = [];
    for (let i = 0; i <= depth; i++) {
        colorStorageBuffers.push(device.createBuffer({
            label: 'color',
            size: colors[i].byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }));
        device.queue.writeBuffer(colorStorageBuffers[i], 0, colors[i]);
    }

    let OrdinaryPointBuffers = [];
    let OrdinaryStorageBuffers = [];
    for(let i=0; i<=depth; i++)
    {
        OrdinaryPointBuffers.push(device.createBuffer({
            label: 'ordinary index buffer',
            size: OrdinaryPointData[i].byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        }));
        device.queue.writeBuffer(OrdinaryPointBuffers[i], 0, OrdinaryPointData[i]);
        OrdinaryStorageBuffers.push(device.createBuffer({
            label: 'ordinary index storage buffer',
            size: OrdinaryPointData[i].byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }));
        device.queue.writeBuffer(OrdinaryStorageBuffers[i], 0, OrdinaryPointData[i]);
    }

    const OrdinaryPointfixedBindGroup = device.createBindGroup({
        label: 'bind group for pipe2',
        layout: pipeline2.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: OrdinaryStorageBuffers[settings.getProterty('ordinaryLevel')] } },
            { binding: 2, resource: { buffer: extra_base_UVStorageBuffers[settings.getProterty('ordinaryLevel')] } },
            { binding: 3, resource: texture.createView() },
            { binding: 4, resource: sampler },
            { binding: 5, resource: { buffer: Base_Vertex_Buffer } },
            { binding: 6, resource: { buffer: Base_Normal_Buffer } },
        ],
    });
    const animeBindGroup = device.createBindGroup({
        label: 'bind group for anime',
        layout: pipelineAnime.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: Base_Vertex_Buffer } }
            
        ],
    });

    const fixedBindGroups = [];
    let changedBindGroups = [];

    for (let i = 0; i < 3; i++) {
        fixedBindGroups.push(device.createBindGroup({
            label: 'fixedbind group for object',
            layout: pipelines[i].getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: { buffer: Base_Vertex_Buffer } },
                { binding: 2, resource: texture.createView() },
                { binding: 3, resource: sampler },
            ],
        }));
        for(let j=0; j<=depth; j++)
        {
            changedBindGroups.push(device.createBindGroup({
                label: 'bind group for object',
                layout: pipelines[i].getBindGroupLayout(1),
                entries: [
                    { binding: 0, resource: { buffer: connectivityStorageBuffers[j] } },
                    { binding: 1, resource: { buffer: base_UVStorageBuffers[j] } },
                    { binding: 2, resource: { buffer: colorStorageBuffers[j] } },
                ],
            }));
        }
    }
    
    return {
        fixedBindGroups,
        OrdinaryPointfixedBindGroup,
        OrdinaryPointBuffers,
        animeBindGroup,
        changedBindGroups
    };

}