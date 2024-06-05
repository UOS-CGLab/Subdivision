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
    
        //console.log("New Position: ", this.position);
    
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

}