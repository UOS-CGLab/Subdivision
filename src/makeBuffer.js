export function createBuffers(device, nArray, depth) {
    depth = depth + 1;

    let texcoordDatas = [];
    let texcoordData_byteLengths = [];
    let indices = [];
    let index_byteLengths = [];

    for (let i = 0; i < depth; i++) {
        let N = nArray[i];
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

    for (let i = 0; i < depth; i++) {
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

    
    // const indices = [indices0, indices1, indices2, indices3, indices4];
    // const texcoordDatas = [texcoordData0, texcoordData1, texcoordData2, texcoordData3, texcoordData4];
    // const indexBuffers = [indexBuffer0, indexBuffer1, indexBuffer2, indexBuffer3, indexBuffer4];
    // const vertexBuffers = [vertexBuffer0, vertexBuffer1, vertexBuffer2, vertexBuffer3, vertexBuffer4];

    const indices2 = indices;
    const texcoordDatas2 = texcoordDatas;
    const indexBuffers2 = indexBuffers;
    const vertexBuffers2 = vertexBuffers;

    return { indices, texcoordDatas, indexBuffers, vertexBuffers }
    //return { indices2, texcoordDatas2, indexBuffers2, vertexBuffers2 }
}