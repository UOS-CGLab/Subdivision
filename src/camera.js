import * as mat4 from "../gl-matrix/mat4.js";
import * as vec3 from "../gl-matrix/vec3.js";


// camera in 3D space
// camera have a position, a direction vector and a up vector, fov = 90
// default position is (0, 0, 2), direction is (0, 0, -1), up is (0, 1, 0)
// size of vectors is 1

// camera move by changing position and direction
// get input from keyboard and mouse

// only need to get view matrix and projection matrix

export class Camera {
    constructor() {
        this.position = vec3.fromValues(0, 0, 10);
        this.target = vec3.fromValues(0, 0, 0);
        this.direction = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0, 1, 0);
        this.right = vec3.create();
        this.viewMatrix = mat4.create();
        this.fov = 90;
        this.aspect = 1;
        this.near = 0.1;
        this.far = 1000;
        this.update();
        this.pastpos = vec3.create();
        this.pastdir = vec3.create();
        this.pastup = vec3.create();
        this.savePosition();
    }

    update() {
        vec3.normalize(this.direction, this.direction);
        vec3.cross(this.right, this.direction, this.up);
        vec3.normalize(this.right, this.right);
        vec3.cross(this.up, this.right, this.direction);
        vec3.normalize(this.up, this.up);
        mat4.lookAt(this.viewMatrix, this.position, vec3.add(vec3.create(), this.position, this.direction), this.up);
    }

    moveForward(distance) {
        vec3.scaleAndAdd(this.position, this.position, this.direction, distance);
    }

    moveRight(distance) {
        vec3.scaleAndAdd(this.position, this.position, this.right, distance);
    }

    moveLeft(distance) {
        vec3.scaleAndAdd(this.position, this.position, this.right, -distance);
    }

    moveUp(distance) {
        vec3.scaleAndAdd(this.position, this.position, this.up, distance);
    }

    moveDown(distance) {
        vec3.scaleAndAdd(this.position, this.position, this.up, -distance);
    }

    moveBackward(distance) {
        vec3.scaleAndAdd(this.position, this.position, this.direction, -distance);
    }

    rotate(dx, dy) {
        let rotation = mat4.create();
    
        // Rotate around the up vector
        mat4.rotate(rotation, rotation, dx, this.up);
    
        // Rotate around the right vector
        mat4.rotate(rotation, rotation, dy, this.right);
    
        // Calculate the new direction vector
        vec3.transformMat4(this.direction, this.direction, rotation);
        vec3.normalize(this.direction, this.direction);
    
        // Move the camera to the new position around the target (object)
        let newPosition = vec3.clone(this.position);
        vec3.subtract(newPosition, newPosition, this.target); // Translate position relative to the target
        vec3.transformMat4(newPosition, newPosition, rotation); // Apply rotation
        vec3.add(newPosition, newPosition, this.target); // Translate back to the target's position
    
        // Update camera position
        vec3.copy(this.position, newPosition);
    
        // console.log("New Position: ", this.position);
    
        // Call update to apply the changes
        this.update();
    }

    setAspect(aspect) {
        this.aspect = aspect;
    }

    setFov(fov) {
        this.fov = fov;
    }

    setNear(near) {
        this.near = near;
    }

    setFar(far) {
        this.far = far;
    }

    getViewMatrix() {
        return this.viewMatrix;
    }

    getProjectionMatrix() {
        let projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, this.fov, this.aspect, this.near, this.far);
        return projectionMatrix;
    }

    getPosition() {
        return this.position;
    }

    getDirection() {
        return this.direction;
    }

    getUp() {
        return this.up;
    }

    savePosition() {
        vec3.copy(this.pastpos, this.position);
        vec3.copy(this.pastdir, this.direction);
        vec3.copy(this.pastup, this.up);
    }

    switchPosition(){
        let pos_temp = vec3.create();
        let dir_temp = vec3.create();
        let up_temp = vec3.create();

        vec3.copy(pos_temp, this.position);
        vec3.copy(dir_temp, this.direction);
        vec3.copy(up_temp, this.up);

        vec3.copy(this.position, this.pastpos);
        vec3.copy(this.direction, this.pastdir);
        vec3.copy(this.up, this.pastup);

        vec3.copy(this.pastpos, pos_temp);
        vec3.copy(this.pastdir, dir_temp);
        vec3.copy(this.pastup, up_temp);

        this.update();
    }
}

let shiftValue = 0;

export function handleKeyUp(ev, camera, keyValue) {
    switch (ev.key) {
        case 'ArrowUp':
            camera.moveUp(keyValue);
            break;
        case 'ArrowDown':
            camera.moveDown(keyValue);
            break;
        case 'ArrowLeft':
            camera.moveLeft(keyValue);
            break;
        case 'ArrowRight':
            camera.moveRight(keyValue);
            break;
        case 'Shift':
            shiftValue = 0;
            break;
        default:
            //return;
    }
    // console.log(ev);
}

export function handleKeyPress(ev, camera) {
    switch (ev.key) {
        case "p":
            camera.savePosition();
            break;
        case ' ':
            camera.switchPosition();
            break;
        default:
            //return;
    }
}

export function handleKeyDown(ev) {
    switch (ev.key) {
        case 'Shift':
            shiftValue = 1;
            break;
        default:
            //return;
    }
    // console.log(ev);
}

export function mouse_move(canvas, camera) {
    let lastX;
    let lastY;
    let dragging = false;
    let selectedPointIndex = null;
    let spaceCheck = false;

    let keyValue = 1;
    
    canvas.onwheel = function(ev) {
        camera.moveForward(ev.deltaY * 0.1);
    }

    canvas.onmousedown = function(ev) {
        if(spaceCheck == 0) {
            let x = ev.clientX, y = ev.clientY;
            let bb = ev.target.getBoundingClientRect();
            if (bb.left <= x && x < bb.right && bb.top <= y && y < bb.bottom) {
                lastX = x;
                lastY = y;
                dragging = true;
            }
        } else {
            let rect = canvas.getBoundingClientRect();
            let x = (ev.clientX - rect.left) / canvas.clientWidth * 2 - 1; // NDC X
            let y = -(ev.clientY - rect.top) / canvas.clientHeight * 2 + 1; // NDC Y

            // 포인트 선택 로직
            getPickedVertexIndex(x, y).then(index => {
                if (index !== null) {
                    selectedPointIndex = index;
                    dragging = true;
                }
            });
        }
    }

    canvas.onmouseup = function(ev) {
        dragging = false; 
        selectedPointIndex = null; 
    };

    canvas.onmousemove = function(ev) {
        if(spaceCheck == 0) {
            let x = ev.clientX;
            let y = ev.clientY;
            if(dragging) {
                let offset = [x - lastX, y - lastY];
                if(offset[0] != 0 || offset[1] != 0) {
                    // console.log(shiftValue);
                    if(shiftValue == 0) {
                        camera.rotate(offset[0] * -0.01, offset[1] * -0.01);
                    } else {
                        // Shift 키를 누른 상태에서 카메라 이동
                        camera.moveRight(-offset[0] * keyValue * 0.1);
                        camera.moveUp(offset[1] * keyValue * 0.1); // 마우스 Y 축 방향이 반대이므로 음수로 설정
                    }
                }
            }
            lastX = x;
            lastY = y;
        } else {
            if (dragging && (selectedPointIndex != null)) {
                let rect = canvas.getBoundingClientRect();
                let x = (ev.clientX - rect.left) / canvas.clientWidth * 2 - 1; // NDC X
                let y = -(ev.clientY - rect.top) / canvas.clientHeight * 2 + 1; // NDC Y

                // 포인트 위치 업데이트 로직
                updatePointPosition(selectedPointIndex, x, y);
            }
        }
    }

    return canvas, keyValue;
}

export function addkeyboardEvent(camera) {
    let keyValue = 0.25;
    document.addEventListener('keyup',    ev => handleKeyUp(ev, camera, keyValue));
    document.addEventListener('keydown',  handleKeyDown);
    document.addEventListener('keypress', ev => handleKeyPress(ev, camera));
}
