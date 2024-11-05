# structure of the program

## Table of Contents
- [Setup](#setup)
- [Preprocesser](#preprocesser)
- [Render](#render)
- [Animation](#real-time-animation)
- [Texture Mapping](#texture-mapping)

## Setup

## Preprocesser
### create json data

### create buffers and pipelines

### create bindgroups


## Render

Our rendering process is divided into 4 main steps:

1. [Subdivision](#subdivision)
2. [Limit points](#limit-points)
3. [Draw ordinary points](#draw-ordinary-points)
4. [Draw limit points](#draw-limit-points)



### Subdivision

The subdivision process is same with ....

### Limit points



### Draw ordinary points

For the ordinary points, we use b-spline patch to draw. Patch with same subdivision level and same texture part have no problem to draw. But when we draw patches with different subdivision level or different texture part, we need to do some extra work.

For the patches with different subdivision level, we use tessellation to draw.

This is the code to generate the texcoord and index data for the tessellation:
```javascript
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
```
For example if max depth is 5, and the subdivision level of patch is 3, patch will be divided as following image.

<img src="./imgs/tesselation.png" alt="Description" width="300">




### Draw limit points

## Real Time Animation
 
## Texture Mapping
