export const mat4 = {
    create() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
    },

    copy(out, a) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
        return out;
    },

    projection(width, height, depth, dst) {
        // Note: This matrix flips the Y axis so that 0 is at the top.
        dst = dst || new Float32Array(16);
        dst[0] = 2 / width; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = -2 / height; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 0.5 / depth; dst[11] = 0;
        dst[12] = -1; dst[13] = 1; dst[14] = 0.5; dst[15] = 1;
        return dst;
    },

    perspective(fieldOfViewYInRadians, aspect, zNear, zFar, dst) {
        dst = dst || new Float32Array(16);

        const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
        const rangeInv = 1 / (zNear - zFar);

        dst[0] = f / aspect;
        dst[1] = 0;
        dst[2] = 0;
        dst[3] = 0;

        dst[4] = 0;
        dst[5] = f;
        dst[6] = 0;
        dst[7] = 0;

        dst[8] = 0;
        dst[9] = 0;
        dst[10] = zFar * rangeInv;
        dst[11] = -1;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = zNear * zFar * rangeInv;
        dst[15] = 0;

        return dst;
    },

    lookAt(out, eye, center, up) {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        let eyex = eye[0];
        let eyey = eye[1];
        let eyez = eye[2];
        let upx = up[0];
        let upy = up[1];
        let upz = up[2];
        let centerx = center[0];
        let centery = center[1];
        let centerz = center[2];
      
        if (
          Math.abs(eyex - centerx) < glMatrix.EPSILON &&
          Math.abs(eyey - centery) < glMatrix.EPSILON &&
          Math.abs(eyez - centerz) < glMatrix.EPSILON
        ) {
          return identity(out);
        }
      
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;
      
        len = 1 / Math.hypot(z0, z1, z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;
      
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.hypot(x0, x1, x2);
        if (!len) {
          x0 = 0;
          x1 = 0;
          x2 = 0;
        } else {
          len = 1 / len;
          x0 *= len;
          x1 *= len;
          x2 *= len;
        }
      
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;
      
        len = Math.hypot(y0, y1, y2);
        if (!len) {
          y0 = 0;
          y1 = 0;
          y2 = 0;
        } else {
          len = 1 / len;
          y0 *= len;
          y1 *= len;
          y2 *= len;
        }
      
        out[0] = x0;
        out[1] = y0;
        out[2] = z0;
        out[3] = 0;
        out[4] = x1;
        out[5] = y1;
        out[6] = z1;
        out[7] = 0;
        out[8] = x2;
        out[9] = y2;
        out[10] = z2;
        out[11] = 0;
        out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out[15] = 1;
      
        return out;
    },

    identity(dst) {
        dst = dst || new Float32Array(16);
        dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    },

    multiply(a, b, dst) {
        dst = dst || new Float32Array(16);
        const b00 = b[0 * 4 + 0];
        const b01 = b[0 * 4 + 1];
        const b02 = b[0 * 4 + 2];
        const b03 = b[0 * 4 + 3];
        const b10 = b[1 * 4 + 0];
        const b11 = b[1 * 4 + 1];
        const b12 = b[1 * 4 + 2];
        const b13 = b[1 * 4 + 3];
        const b20 = b[2 * 4 + 0];
        const b21 = b[2 * 4 + 1];
        const b22 = b[2 * 4 + 2];
        const b23 = b[2 * 4 + 3];
        const b30 = b[3 * 4 + 0];
        const b31 = b[3 * 4 + 1];
        const b32 = b[3 * 4 + 2];
        const b33 = b[3 * 4 + 3];
        const a00 = a[0 * 4 + 0];
        const a01 = a[0 * 4 + 1];
        const a02 = a[0 * 4 + 2];
        const a03 = a[0 * 4 + 3];
        const a10 = a[1 * 4 + 0];
        const a11 = a[1 * 4 + 1];
        const a12 = a[1 * 4 + 2];
        const a13 = a[1 * 4 + 3];
        const a20 = a[2 * 4 + 0];
        const a21 = a[2 * 4 + 1];
        const a22 = a[2 * 4 + 2];
        const a23 = a[2 * 4 + 3];
        const a30 = a[3 * 4 + 0];
        const a31 = a[3 * 4 + 1];
        const a32 = a[3 * 4 + 2];
        const a33 = a[3 * 4 + 3];

        dst[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
        dst[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
        dst[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
        dst[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

        dst[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
        dst[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
        dst[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
        dst[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;

        dst[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
        dst[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
        dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
        dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;

        dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
        dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
        dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
        dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

        return dst;
    },

    translation([tx, ty, tz], dst) {
        dst = dst || new Float32Array(16);
        dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
        dst[12] = tx; dst[13] = ty; dst[14] = tz; dst[15] = 1;
        return dst;
    },

    rotationX(angleInRadians, dst) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        dst = dst || new Float32Array(16);
        dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = c; dst[6] = s; dst[7] = 0;
        dst[8] = 0; dst[9] = -s; dst[10] = c; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    },

    rotationY(angleInRadians, dst) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        dst = dst || new Float32Array(16);
        dst[0] = c; dst[1] = 0; dst[2] = -s; dst[3] = 0;
        dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
        dst[8] = s; dst[9] = 0; dst[10] = c; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    },

    rotationZ(angleInRadians, dst) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        dst = dst || new Float32Array(16);
        dst[0] = c; dst[1] = s; dst[2] = 0; dst[3] = 0;
        dst[4] = -s; dst[5] = c; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    },

    scaling([sx, sy, sz], dst) {
        dst = dst || new Float32Array(16);
        dst[0] = sx; dst[1] = 0; dst[2] = 0; dst[3] = 0;
        dst[4] = 0; dst[5] = sy; dst[6] = 0; dst[7] = 0;
        dst[8] = 0; dst[9] = 0; dst[10] = sz; dst[11] = 0;
        dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
        return dst;
    },

    translate(m, translation, dst) {
        return mat4.multiply(m, mat4.translation(translation), dst);
    },

    rotateX(m, angleInRadians, dst) {
        return mat4.multiply(m, mat4.rotationX(angleInRadians), dst);
    },

    rotateY(m, angleInRadians, dst) {
        return mat4.multiply(m, mat4.rotationY(angleInRadians), dst);
    },

    rotateZ(m, angleInRadians, dst) {
        return mat4.multiply(m, mat4.rotationZ(angleInRadians), dst);
    },

    rotate(out, a, rad, axis) {
        let x = axis[0],
          y = axis[1],
          z = axis[2];
        let len = Math.hypot(x, y, z);
        let s, c, t;
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;
        let b00, b01, b02;
        let b10, b11, b12;
        let b20, b21, b22;
      
        if (len < glMatrix.EPSILON) {
          return null;
        }
      
        len = 1 / len;
        x *= len;
        y *= len;
        z *= len;
      
        s = Math.sin(rad);
        c = Math.cos(rad);
        t = 1 - c;
      
        a00 = a[0];
        a01 = a[1];
        a02 = a[2];
        a03 = a[3];
        a10 = a[4];
        a11 = a[5];
        a12 = a[6];
        a13 = a[7];
        a20 = a[8];
        a21 = a[9];
        a22 = a[10];
        a23 = a[11];
      
        // Construct the elements of the rotation matrix
        b00 = x * x * t + c;
        b01 = y * x * t + z * s;
        b02 = z * x * t - y * s;
        b10 = x * y * t - z * s;
        b11 = y * y * t + c;
        b12 = z * y * t + x * s;
        b20 = x * z * t + y * s;
        b21 = y * z * t - x * s;
        b22 = z * z * t + c;
      
        // Perform rotation-specific matrix multiplication
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a03 * b00 + a13 * b01 + a23 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[7] = a03 * b10 + a13 * b11 + a23 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        out[11] = a03 * b20 + a13 * b21 + a23 * b22;
      
        if (a !== out) {
          // If the source and destination differ, copy the unchanged last row
          out[12] = a[12];
          out[13] = a[13];
          out[14] = a[14];
          out[15] = a[15];
        }
        return out;
    },

    scale(m, scale, dst) {
        return mat4.multiply(m, mat4.scaling(scale), dst);
    },

    invert(out, a) {
        let a00 = a[0],
          a01 = a[1],
          a02 = a[2],
          a03 = a[3];
        let a10 = a[4],
          a11 = a[5],
          a12 = a[6],
          a13 = a[7];
        let a20 = a[8],
          a21 = a[9],
          a22 = a[10],
          a23 = a[11];
        let a30 = a[12],
          a31 = a[13],
          a32 = a[14],
          a33 = a[15];
      
        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;
      
        // Calculate the determinant
        let det =
          b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      
        if (!det) {
          return null;
        }
        det = 1.0 / det;
      
        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      
        return out;
    }


      
};