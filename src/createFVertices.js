export async function createFVertices(folderName, depth) {
    if (!folderName) {
        console.error('Error: folderName is undefined or empty.');
        return;
    }

    const basePath = `./`+folderName;

    let preConnectivityData = [];
    let preBaseUVData = [];
    try {
        const patchResponse = await fetch(`${basePath}/patch.txt`);
        const patchData = await patchResponse.text();
        const subArrays = patchData.split('-');
        subArrays.forEach((subArray, index) => {
            const preDataArray = subArray.split(',').map(parseFloat);
            let dataArray1 = [];
            let dataArray2 = [];
            for(let i=0; i<preDataArray.length; i++)
            {
                if(((i >> 4) % 3) == 0)
                {
                    dataArray1.push(preDataArray[i]);
                }
                else
                {
                    dataArray2.push(preDataArray[i])
                }
                // if(((i >> 3) % 3) == 2)
                // {
                //     dataArray2.push(preDataArray[i]);
                // }
                // else
                // {
                //     dataArray1.push(preDataArray[i])
                // }
            }
            preConnectivityData.push(new Uint32Array(dataArray1));
            preBaseUVData.push(new Float32Array(dataArray2));
        });
    } catch (error) {
        console.error('Error fetching patch.txt:', error);
        return;
    }

    let preOrdinaryPointData = [];
    let preExtraBaseUVData = [];
    try {
        for(let i=0; i<=depth; i++)
        {
            const extraOrdinaryResponse = await fetch(`${basePath}/extra_ordinary`+i+`.txt`);
            const extraOrdinaryData = await extraOrdinaryResponse.text();
            const preDataArray = extraOrdinaryData.split(',').map(parseFloat);
            let dataArray1 = [];
            let dataArray2 = [];
            for(let i=0; i<preDataArray.length; i++)
            {
                if((parseInt(i / 6) % 3) == 0)
                {
                    dataArray1.push(preDataArray[i]);
                }
                else
                {
                    dataArray2.push(preDataArray[i])
                }
                // else if(i >= 12 && i <= 15)
                // {
                //     continue;
                // }
                // else
                // {
                //     dataArray2.push(preDataArray[i]);
                // }
            }
            preOrdinaryPointData.push(new Uint32Array(dataArray1));
            preExtraBaseUVData.push(new Float32Array(dataArray2));
        }
    } catch (error) {
        console.error('Error fetching extra_ordinary.txt:', error);
        return;
    }

    const connectivitys = preConnectivityData;
    const base_UV = preBaseUVData;
    const OrdinaryPointData = preOrdinaryPointData;
    const extra_base_UV = preExtraBaseUVData;

    console.log(connectivitys);
    console.log(base_UV);

    return {
        connectivitys,
        base_UV,
        OrdinaryPointData,
        extra_base_UV,
    };
}