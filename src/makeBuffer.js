function max(a, b)
{
    return a > b ? a : b;
}

function forMakeBuffer(device, depth, patchLevel) {
    let texcoordDatas = [];
    let texcoordData_byteLengths = [];
    let indices = [];
    let index_byteLengths = [];

    for (let i = 0; i <= depth; i++) {
        let N = max(2**(depth-i-patchLevel), 1);
        // let N = 1.0;
        let texcoordData = new Float32Array((N + 1) * (N + 1) * 2);
        let offset = 0;
        for (let row = 0; row <= N; ++row) {
            for (let col = 0; col <= N; ++col) {
                texcoordData[offset++] = (row / N);
                texcoordData[offset++] = (col / N);
            }
        }
        texcoordDatas.push(texcoordData);
        let texcoordData_byteLength = texcoordData.byteLength;
        texcoordData_byteLengths.push(texcoordData_byteLength);
        let index = new Uint32Array(N * N * 6);
        offset = 0;
        for (let row = 0; row < N; ++row) {
            for (let col = 0; col < N; ++col) {
                index[offset++] = (row + col * (N + 1));
                index[offset++] = (row + (col + 1) * (N + 1));
                index[offset++] = (row + col * (N + 1) + 1);
                index[offset++] = (row + col * (N + 1) + 1);
                index[offset++] = (row + (col + 1) * (N + 1));
                index[offset++] = ((row + 1) + (col + 1) * (N + 1));
            }
        }
        indices.push(index);
        let index_byteLength = index.byteLength;
        index_byteLengths.push(index_byteLength);
    }

    let vertexBuffers = [];
    let indexBuffers = [];

    for (let i = 0; i <= depth; i++) {
        const vertexBuffer = device.createBuffer({
            label: 'vertex buffer vertices',
            size: texcoordData_byteLengths[i],
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        const indexBuffer = device.createBuffer({
            label: 'index buffer',
            size: index_byteLengths[i],
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });

        vertexBuffers.push(vertexBuffer);
        indexBuffers.push(indexBuffer);
    }

    return { indices, texcoordDatas, indexBuffers, vertexBuffers }
}

export function createBuffers(device, depth)
{
    let texcoordDatasArray = [];
    let indicesArray = [];
    let indexBuffersArray = [];
    let vertexBuffersArray = [];

    for(let i=0; i<=depth; i++)
    {
        let { indices, texcoordDatas, indexBuffers, vertexBuffers } = forMakeBuffer(device, depth, i);
        texcoordDatasArray.push(texcoordDatas);
        indicesArray.push(indices);
        indexBuffersArray.push(indexBuffers);
        vertexBuffersArray.push(vertexBuffers);
    }

    let indices = indicesArray;
    let texcoordDatas = texcoordDatasArray;
    let indexBuffers = indexBuffersArray;
    let vertexBuffers = vertexBuffersArray;

    return { indices, texcoordDatas, indexBuffers, vertexBuffers }
}