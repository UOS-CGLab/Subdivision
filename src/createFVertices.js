export async function createFVertices(folderName, depth) {
    if (!folderName) {
        console.error('Error: folderName is undefined or empty.');
        return;
    }

    const basePath = `./`+folderName;

    // let preVertexCubeData;
    // try {
    //     const coordResponse = await fetch(`${basePath}/coord.txt`);
    //     const coordData = await coordResponse.text();
    //     const coordArray = coordData.split(',').map(parseFloat);
    //     preVertexCubeData = new Float32Array(coordArray);
    // } catch (error) {
    //     console.error('Error fetching coord.txt:', error);
    //     return;
    // }

    // const vertexCubeData = preVertexCubeData;

    let preConnectivityData = [];
    try {
        const patchResponse = await fetch(`${basePath}/patch.txt`);
        const patchData = await patchResponse.text();
        const subArrays = patchData.split('-');
        subArrays.forEach((subArray, index) => {
            const dataArray = subArray.split(',').map(parseFloat);
            // preConnectivityData[index] = new Uint32Array(dataArray);
            preConnectivityData.push(new Uint32Array(dataArray));
        });
    } catch (error) {
        console.error('Error fetching patch.txt:', error);
        return;
    }

    const [connectivity0, connectivity1, connectivity2, connectivity3, connectivity4] = preConnectivityData;

    let preOrdinaryPointData;
    try {
        const extraOrdinaryResponse = await fetch(`${basePath}/extra_ordinary.txt`);
        const extraOrdinaryData = await extraOrdinaryResponse.text();
        const ordinaryArray = extraOrdinaryData.split(',').map(parseFloat);
        preOrdinaryPointData = new Uint32Array(ordinaryArray);
    } catch (error) {
        console.error('Error fetching extra_ordinary.txt:', error);
        return;
    }

    const OrdinaryPointData = preOrdinaryPointData;

    const connectivitys = preConnectivityData;

    return {
        connectivitys,
        OrdinaryPointData,
    };
}