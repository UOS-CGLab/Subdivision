import * as dat from '../node_modules/dat.gui/build/dat.gui.module.js';

export class Settings {
    constructor() {
        this.settings = {
            // renderingMode: 'solid',
            // object: 'suzanne',
            pipelineSetting: 'F',
            color: 'normal',
            tesselation: 3,
            ordinaryLevel: 3,
            draw: [true, true, true, true, false, true, true, true],
            moveSpeed: 1,
            wireAdjust: 0,
            displacementValue: 30,
            animation: false,
        };
    }

    addGui(gui) {
        // gui.add(this.settings, 'renderingMode', ['solid', 'wireframe', 'points']).name('renderingMode')// .onChange((name, value) => this.onRadioChange('renderingMode', value));
        // gui.add(this.settings, 'object', ['suzanne', 'monsterfrog', 'bunny', 'dragon', 'cube', 'sphere']).name('object')
        gui.add(this.settings, 'pipelineSetting', ['V', 'L', 'F']).name('Pipeline V or L or F')// .onChange((name, value) => this.onRadioChange('pipelineSetting', value));
        gui.add(this.settings, 'color', ['position', 'normal', 'level', 'displacement_texture']).name('Color')// .onChange((name, value) => this.onRadioChange('pipelineSetting', value));
        gui.add(this.settings, 'tesselation', 0, 7, 1).name('tesselation').step(1)// .onChange((name, value) => this.onSliderChange('tesselation', value));
        gui.add(this.settings, 'ordinaryLevel', 0, 4, 1).name('ordinaryLevel').step(1)// .onChange((name, value) => this.onSliderChange('ordinaryLevel', value));

        for (let i = 0; i < 8; i++) {
            gui.add(this.settings.draw, i).name('Draw ' + (i + 1))// .onChange((name, value) => this.onCheckboxChange('Draw ' + (i + 1), value));
        }

        gui.add(this.settings, 'wireAdjust', 0, 0.1).name('wireAdjust')// .onChange((name, value) => this.onSliderChange('wireAdjust', value));
        gui.add(this.settings, 'displacementValue', 0, 100).name('displacementValue')// .onChange((name, value) => this.onSliderChange('displacementValue', value));
        gui.add(this.settings, 'moveSpeed', 0, 100).name('moveSpeed')// .onChange((name, value) => this.onSliderChange('moveSpeed', value));
        gui.add(this.settings, 'animation').name('animation')// .onChange((name, value) => this.onSliderChange('moveSpeed', value));
    }

    onRadioChange(name, value) {
        console.log(name, 'changed to', value);
    }

    onSliderChange(name, value) {
        console.log(name, 'changed to', value);
    }

    onCheckboxChange(name, value) {
        console.log(name, 'changed to', value);
    }

    getProterty(name) {
        switch (name) {
            case 'renderingMode':
                return this.settings.renderingMode;
            case 'pipelineSetting':
                return this.settings.pipelineSetting;
            case 'color':
                return this.settings.color;
            case 'tesselation':
                return this.settings.tesselation;
            case 'ordinaryLevel':
                return this.settings.ordinaryLevel;
            case 'draw':
                return this.settings.draw;
            case 'moveSpeed':
                return this.settings.moveSpeed;
            case 'wireAdjust':
                return this.settings.wireAdjust;
            case 'displacementValue':
                return this.settings.displacementValue;
            case 'animation':
                return this.settings.animation;
            default:
                return null;
        }
    }
}

export class LightPosition {
    constructor(camera) {
        this.camera = camera;
        this.lightPosition = {
            lightActive: false,
            lightIsView: false,
            positionX: 0,
            positionY: 0,
            positionZ: 0,
        };
        this.guiControllers = {};
    }

    addGui(gui) {
        this.guiControllers.lightActive = gui.add(this.lightPosition, 'lightActive').name('lightActive');
        this.guiControllers.lightIsView = gui.add(this.lightPosition, 'lightIsView').name('lightIsView');
        this.guiControllers.positionX = gui.add(this.lightPosition, 'positionX', -100, 100).name('Position X');
        this.guiControllers.positionY = gui.add(this.lightPosition, 'positionY', -100, 100).name('Position Y');
        this.guiControllers.positionZ = gui.add(this.lightPosition, 'positionZ', -100, 100).name('Position Z');
    }

    getProterty(name) {
        switch (name) {
            case 'lightActive':
                return this.lightPosition.lightActive;
            case 'lightIsView':
                return this.lightPosition.lightIsView;
            case 'positionX':
                return this.lightPosition.positionX;
            case 'positionY':
                return this.lightPosition.positionY;
            case 'positionZ':
                return this.lightPosition.positionZ;
            default:
                return null;
        }
    }

    setProterty(name, value) {
        if (this.lightPosition.hasOwnProperty(name)) {
            this.lightPosition[name] = value;
            if (this.guiControllers[name]) {
                this.guiControllers[name].setValue(value);
            }
        }
    }

    // updateFromCamera() {
    //     if (!this.camera) return;
    //     console.log(this.camera.position.x);

    //     this.lightPosition.positionX = this.camera.position.x;
    //     this.lightPosition.positionY = this.camera.position.y;
    //     this.lightPosition.positionZ = this.camera.position.z;

    //     this.guiControllers.positionX.setValue(this.lightPosition.positionX);
    //     this.guiControllers.positionY.setValue(this.lightPosition.positionY);
    //     this.guiControllers.positionZ.setValue(this.lightPosition.positionZ);
    // }
    
    // animate() {
    //     if(this.lightPosition.lightIsView && this.lightPosition.lightActive)
    //     {
    //         this.updateFromCamera();
    //         requestAnimationFrame(this.animate.bind(this));
    //     }
    // }
}

export function initializeScene(camera) {
    let gui = new dat.GUI();

    let settingsFolder = gui.addFolder('Settings');
    let settings = new Settings();
    settings.addGui(settingsFolder);

    let lightFolder = gui.addFolder('Light Position');
    let lightPosition = new LightPosition(camera);
    lightPosition.addGui(lightFolder);

    settingsFolder.open();
    lightFolder.open();

    return {
        settings, lightPosition,
    }
}

function guiStyles() {
    const guiContainer = document.querySelector('.dg.main');
    if (guiContainer) {
        // Apply general styles to the container
        guiContainer.style.backgroundColor = 'transparent';
        guiContainer.style.color = '#e0e0e0';
        guiContainer.style.borderRadius = '10px';
        guiContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        guiContainer.style.padding = '0px';

        // Style close buttons
        document.querySelectorAll('.dg.main .close-button').forEach(button => {
            button.style.color = '#e0e0e0';
            button.style.backgroundColor = '#444';
            button.style.borderRadius = '5px';
            button.style.padding = '5px 10px';
            button.style.cursor = 'pointer';
            button.style.transition = 'background-color 0.3s ease';
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#555';
            });
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#444';
            });
        });

        // Style input elements
        document.querySelectorAll('.dg.main .cr.number input[type="text"], .dg.main .cr.string input[type="text"], .dg.main .cr.boolean input[type="checkbox"]').forEach(input => {
            input.style.backgroundColor = '#444';
            input.style.color = '#e0e0e0';
            input.style.border = '1px solid #555';
            input.style.borderRadius = '4px';
            input.style.padding = '5px';
            input.style.margin = '5px 0';
            input.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';

            input.addEventListener('focus', () => {
                input.style.borderColor = '#777';
                input.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.3)';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = '#555';
                input.style.boxShadow = 'none';
            });
        });

        // Style labels
        document.querySelectorAll('.dg.main .property-name').forEach(label => {
            label.style.color = '#aaa';
            label.style.fontWeight = 'bold';
        });

        // Add hover effects to container elements
        document.querySelectorAll('.dg.main .cr').forEach(control => {
            control.style.transition = 'background-color 0.3s ease';
            control.addEventListener('mouseover', () => {
                control.style.backgroundColor = '#3c3c3c';
            });
            control.addEventListener('mouseout', () => {
                control.style.backgroundColor = 'transparent';
            });
        });
    }
}