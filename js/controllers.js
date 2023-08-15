import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

let controller1, controller2;
let controllerGrip1, controllerGrip2;
let controllers = [];
let squeeze = [0, 0];
let grip_location = new THREE.Vector3();

const box = new THREE.Box3();

export function add_controllers(renderer, scene, use_hands) {


    // if ( use_hands ) {

    // controllers
    const controller1 = renderer.xr.getController(0);
    // console.log(controller1)
    scene.add(controller1);

    const controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    // Hand 1
    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    controller1.add(controllerGrip1);

    const handModelFactory = new XRHandModelFactory();

    const hand1 = renderer.xr.getHand(0);
    hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));
    scene.add(hand1);

    // Hand 2
    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    const hand2 = renderer.xr.getHand(1);
    hand2.add(handModelFactory.createHandModel(hand2, 'mesh'));
    scene.add(hand2);

    // console.log(hand2)
    // let cs = [controllerGrip1,controllerGrip2,hand1,hand2];
    let cs = [controllerGrip1, controllerGrip2];
    cs.forEach(c => {
        c.addEventListener('connected', controllerConnected);
        c.addEventListener('disconnected', controllerDisconnected);
        c.addEventListener('squeezestart', onSqueezeStart);
        c.addEventListener('squeezeend', onSqueezeEnd);
        c.addEventListener('selectstart', onSelectStart);
        c.addEventListener('selectend', onSelectEnd);
    })
}

function onSelectStart(evt) {
    evt.target.userData.selected = true;
    evt.target.userData.select_start_position = evt.target.position.clone();
    // console.log('select on')
}

function onSelectEnd(evt) {
    evt.target.userData.selected = false;
    evt.target.userData.select_start_position = evt.target.position.clone();
    // params.displacement = new Vector3(0,0,0);
    // console.log('select off')
}

function onSqueezeStart(evt) {
    evt.target.userData.squeezed = true;
    evt.target.userData.squeeze_start_position = evt.target.position.clone();
    // console.log('squeeze on')
}

function onSqueezeEnd(evt) {
    evt.target.userData.squeezed = false;
    evt.target.userData.select_start_position = evt.target.position.clone();
    // console.log('squeeze off')
}

function controllerConnected(evt) {

    evt.target.userData.selected = false;
    evt.target.userData.squeezed = false;
    controllers.push({
        gamepad: evt.data.gamepad,
        grip: evt.target,
    });

}

function controllerDisconnected(evt) {

    const index = controllers.findIndex(o => o.controller === evt.target);
    if (index !== - 1) {

        controllers.splice(index, 1);

    }

}

export function handleCollisions(params, group) {

    return params;

}
