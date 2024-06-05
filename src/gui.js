import GUI from 'https://webgpufundamentals.org/3rdparty/muigui-0.x.module.js';

export function initializeScene() {

    const degToRad = d => d * Math.PI / 180;

    const settings = {
        translation: [0, 0, -50],
        rotation: [degToRad(-25), degToRad(-70), degToRad(180)],
        scale: [2, 1, 2],
        pipelineValue: [1],
        nArray: [4],
        draw: [1, 1, 1, 1, 1, 1, 1],
    };

    const radToDegOptions = { min: -360, max: 360, step: 1, converters: GUI.converters.radToDeg };

    const gui = new GUI();

    gui.add(settings.translation, '0', -100, 100).name('translation.x');
    gui.add(settings.translation, '1', -100, 100).name('translation.y');
    gui.add(settings.translation, '2', -1000, 1000).name('translation.z');
    gui.add(settings.rotation, '0', radToDegOptions).name('rotation.x');
    gui.add(settings.rotation, '1', radToDegOptions).name('rotation.y');
    gui.add(settings.rotation, '2', radToDegOptions).name('rotation.z');
    gui.add(settings.scale, '0', -5, 20).name('scale.x');
    gui.add(settings.scale, '1', -5, 20).name('scale.y');
    gui.add(settings.scale, '2', -5, 20).name('scale.z');
    gui.add(settings.pipelineValue, '0', 0, 3).name('pipeline V or L or F');
    gui.add(settings.nArray, '0', 0, 7);
    gui.add(settings.draw, '0', 0, 1);
    gui.add(settings.draw, '1', 0, 1);
    gui.add(settings.draw, '2', 0, 1);
    gui.add(settings.draw, '3', 0, 1);
    gui.add(settings.draw, '4', 0, 1);
    gui.add(settings.draw, '5', 0, 1);
    gui.add(settings.draw, '6', 0, 1);

    return { settings };
}
