import css from "../css/main.css";
import map from "./datguivr.map";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Lut } from 'three/examples/jsm/math/Lut.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { CustomShader } from "./shaders.js";
import * as CONTROLLERS from './controllers.js';
import * as DAT from "./datguivr.min.js";
// console.log(DAT)

var camera, controls, scene, renderer, dolly, gui;
var up = 0;
var left = 0;
var direction = new THREE.Vector3; // controller properties
direction.x = 0; direction.y = 0; direction.z = 0;
var clock = new THREE.Clock();
var lut = new Lut("cooltowarm", 512); // options are rainbow, cooltowarm and blackbody
var floor, stack, grid, inversion_layer
var vert_axis, horiz_axis, temp_line, top_temp_line;
var particles = new THREE.Group;
var world_objects = new THREE.Group;
var y_offset;
var VR;
var temp_scale = 5.; // m/deg C
var adiab_line;
// const container = document.getElementById('container');

var vive = false; // if false, use oculus instead
// diffusion parameters
var params = {
    'D': 0.01, 'birth_rate': 100., 'u': 1.0,
    'Dx': true, 'H_stack': 2.0, 'Gamma': 10,
    'Gamma_inv': -200, 'T_surf': 25, 'T_stack': 0,
    'H_inversion': 20, 'adiab': true, 'colour_by': 'Relative Temp',
    'inversion_layer': false, 'cmin': -0.25, 'cmax': 0.25,
    'turbulence': false, 'I': 0.2, 'omega': 1.0,
    'wind_type': 'Boundary Layer',
    // 'wind_type':'Uniform',
}
lut.setMin(params.cmin);
lut.setMax(params.cmax);

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('VR') || urlParams.has('vr')) {
    VR = true;
    y_offset = 2; // vertical offset to get camera at right height
}
else {
    VR = false;
    y_offset = 0;
}

var root_dir = 'http://localhost:54321/';
if (window.location.hostname.includes('benjymarks')) {
    root_dir = 'http://www.benjymarks.com/dispersion-vr/';
    cache = true;
}
else if (window.location.hostname.includes('github')) {
    root_dir = 'https://benjym.github.io/dispersion-vr/';
}

var fly_speed = 2.; // how fast you can fly in VR
//        var numParticles = 1;
var D = 0.1; // diffusivity
// var birth_rate = 100.; // how often to add a particle
var u = 1.0; // wind velocity
var Dx = false; // diffusion in downwind direction
// stack
var R = 0.1; // stack radius
var g = 9.81; // acceleration due to gravity
var Gamma_dry_adb = 10.0 // deg C / km
var N_max = 2000;
var X_max = 50;
var nR = 1000.; // nR from PV=nRT, sets initial size of particles
var positions = new Float32Array(N_max * 3);
var T = new Float32Array(N_max);
var v_y = new Float32Array(N_max);
// var H = 5; // height of temperature lines
// const presets = { 'Presets': ['Looping', 'Coning', 'Fanning', 'Lofting', 'Fumigation', 'Trapping'] };
const presets = {'Presets' : 'Choose one'}
var preset_settings = [ // FIXME - THESE ARE ALL WRONG!!!!
    { 'Presets': 'Looping', 'u': 0.5, 'H_stack': 10, 'Gamma': 200, 'Gamma_inv': 200, 'T_stack': 0, 'inversion_layer': false, 'turbulence': true }, // strong lapse condition
    { 'Presets': 'Coning', 'u': 0.5, 'H_stack': 10, 'Gamma': 1, 'Gamma_inv': 0, 'T_stack': 0, 'inversion_layer': false, 'turbulence': false }, // weak lapse condition
    { 'Presets': 'Fanning', 'u': 0.5, 'H_stack': 10, 'H_inversion': 100, 'Gamma': -200, 'inversion_layer': false, 'T_stack': 0, 'turbulence': false }, // inverse condition
    { 'Presets': 'Lofting', 'u': 0.5, 'H_stack': 10, 'H_inversion': 9.5, 'Gamma': -500, 'Gamma_inv': 100, 'T_stack': 0, 'inversion_layer': true, 'turbulence': false }, // inverse below, lapse aloft
    { 'Presets': 'Fumigation', 'u': 0.5, 'H_stack': 10, 'H_inversion': 10.5, 'Gamma': 200, 'Gamma_inv': -200, 'T_stack': 0, 'inversion_layer': true, 'turbulence': false }, // lapse below, inversion aloft
    { 'Presets': 'Trapping', 'u': 0.5, 'H_stack': 10, 'H_inversion': 10.5, 'Gamma': 1, 'Gamma_inv': -100, 'T_stack': 0, 'inversion_layer': true, 'turbulence': false }, // weak lapse below, inversion aloft
]
var debug_VR = false;
var debug_air_flow = false;
var colour_options = false;

init();
add_renderer();
// add_controllers();
add_temp_axes();
if (VR) {
    console.log(DAT)
    gui = DAT.create('Parameters');
    add_gui();
    gui.position.x = 2;
    gui.position.z = -2;
    gui.rotation.y = -Math.PI / 2.;
    gui.position.y = 2;
    scene.add(gui);
}
else {
    gui = new GUI({ width: 400 });
    add_gui();
}
add_particles();
animate();
if (debug_VR) {
    add_left_oculus_model(stack);
    add_right_oculus_model(vert_cone);
}

function rotateAboutPoint(obj, point, axis, theta, pointIsWorld) {
    // obj - your object (THREE.Object3D or derived)
    // point - the point of rotation (THREE.Vector3)
    // axis - the axis of rotation (normalized THREE.Vector3)
    // theta - radian value of rotation
    // pointIsWorld - boolean indicating the point is in world coordinates (default = false)
    pointIsWorld = (pointIsWorld === undefined) ? false : pointIsWorld;
    if (pointIsWorld) { obj.parent.localToWorld(obj.position); } // compensate for world coordinate
    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset
    if (pointIsWorld) { obj.parent.worldToLocal(obj.position); }// undo world coordinates compensation
    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

function add_temp_axes() {

    var H = params.H_stack + 20;
    var geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    var material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    vert_axis = new THREE.Mesh(geometry, material);
    vert_axis.scale.y = 3.;
    vert_axis.position.y = 3. / 2. - params.H_stack;
    vert_axis.position.z = -2.;
    world_objects.add(vert_axis);

    horiz_axis = new THREE.Mesh(geometry, material);
    horiz_axis.scale.y = params.T_surf / temp_scale;
    horiz_axis.position.y = -params.H_stack;
    horiz_axis.position.z = -2. - params.T_surf / temp_scale / 2.;
    horiz_axis.rotation.x = Math.PI / 2;
    world_objects.add(horiz_axis);

    temp_line = new THREE.Mesh(geometry, material);
    temp_line.scale.y = H;
    // temp_line.position.y = H/2.-params.H_stack;
    // temp_line.position.z = -2. - params.T_surf/temp_scale;
    world_objects.add(temp_line);

    top_temp_line = new THREE.Mesh(geometry, material);
    top_temp_line.scale.y = H;
    top_temp_line.position.y = H / 2. - params.H_stack;
    top_temp_line.position.z = -2. - params.T_surf / temp_scale;
    world_objects.add(top_temp_line);
    top_temp_line.visible = params.inversion_layer;

    var geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 32);
    var material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    adiab_line = new THREE.Mesh(geometry, material);
    adiab_line.scale.y = H;
    adiab_line.position.y = H / 2. - params.H_stack;
    adiab_line.position.z = -2. - params.T_surf / temp_scale;
    world_objects.add(adiab_line);
    var rot_angle = Math.atan(Gamma_dry_adb / 1000.);
    rotateAboutPoint(adiab_line, new THREE.Vector3(0, -2, -2 - params.T_surf / temp_scale), new THREE.Vector3(1, 0, 0), rot_angle, false);

    var geometry = new THREE.CylinderGeometry(0., 0.2, 1, 32);
    var material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    var vert_cone = new THREE.Mesh(geometry, material);
    vert_cone.scale.y = 0.2;
    vert_cone.position.y = 2.5 - params.H_stack;
    vert_axis.add(vert_cone);

    var geometry = new THREE.CylinderGeometry(0.2, 0., 1, 32);
    var material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    var horiz_cone = new THREE.Mesh(geometry, material);
    horiz_cone.scale.y = 0.2;
    // horiz_cone.position.y = 2.5-params.H_stack;
    // horiz_cone.rotation.x = Math.PI/2;
    horiz_cone.position.y = - params.T_surf / temp_scale / 8.;
    horiz_axis.add(horiz_cone);

    var font_loader = new FontLoader();
    font_loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', function (font) {
        // font_loader.load( root_dir + 'node_modules/three/examples/fonts/helvetiker_bold.typeface.json', function ( font ) {
        var fontsize = 0.25;
        var geometry = new TextGeometry("Temperature", { font: font, size: fontsize, height: fontsize / 5. });
        var material = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        var temp_label = new THREE.Mesh(geometry, material);
        temp_label.rotation.x = -Math.PI / 2.;
        temp_label.rotation.y = Math.PI / 2.;
        temp_label.position.z = -0.3;
        temp_label.position.y = 4.0;
        horiz_cone.add(temp_label);

        var geometry = new TextGeometry("Environmental lapse", { font: font, size: fontsize, height: fontsize / 5. });
        var material = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        var curr_label = new THREE.Mesh(geometry, material);
        curr_label.rotation.x = -Math.PI / 2.;
        curr_label.rotation.z = Math.PI / 2.;
        curr_label.position.x = -0.4;
        curr_label.position.z = -2.0;
        curr_label.position.y = 0.6;
        horiz_cone.add(curr_label);

        var geometry = new TextGeometry("Altitude", { font: font, size: fontsize, height: fontsize / 5. });
        var z_label = new THREE.Mesh(geometry, material);
        z_label.position.x = -0.3;
        z_label.position.y = -2.5;
        z_label.rotation.z = Math.PI / 2.;
        vert_cone.add(z_label);
        z_label.scale.x = 2.;

        var geometry = new TextGeometry("Adiabatic lapse", { font: font, size: fontsize, height: fontsize / 5. });
        var material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        var ALR_label = new THREE.Mesh(geometry, material);
        ALR_label.rotation.x = -Math.PI / 2.;
        ALR_label.rotation.z = Math.PI / 2.;
        ALR_label.position.x = 0.8;
        ALR_label.position.z = -2.0;
        ALR_label.position.y = 0.6;
        horiz_cone.add(ALR_label);

    });

    reset_temp_line();

}

function reset_temp_line() {

    if (params.Gamma > 0) {
        params.turbulence = true;
        params.I = 0.2 * params.Gamma / 1000. // FIXME - this is currently garbage

    }
    else {
        params.turbulence = false;
    }

    var H = params.H_stack + 20;
    // vert_axis.scale.y = H;
    vert_axis.position.y = 3. / 2. - params.H_stack;
    horiz_axis.scale.y = params.T_surf / temp_scale;
    horiz_axis.position.y = -params.H_stack;
    horiz_axis.position.z = -2. - params.T_surf / temp_scale / 2.;

    top_temp_line.visible = params.inversion_layer;
    if (params.inversion_layer) {
        var rot_angle = Math.atan(params.Gamma / 1000. / temp_scale);
        var L = params.H_inversion / Math.cos(rot_angle);
        temp_line.position.x = 0;
        temp_line.scale.y = L;
        temp_line.position.y = L / 2. - params.H_stack;
        temp_line.position.z = -2. - params.T_surf / temp_scale;
        temp_line.rotation.x = 0;
        rotateAboutPoint(temp_line, new THREE.Vector3(0, -params.H_stack, -2 - params.T_surf / temp_scale), new THREE.Vector3(1, 0, 0), rot_angle, false);

        var rot_angle = Math.atan(params.Gamma_inv / 1000. / temp_scale);
        var L_top = (H - params.H_inversion) / Math.cos(rot_angle);
        var T_top = params.T_surf - params.Gamma * params.H_inversion / 1000. // temperature at bottom of inversion layer
        top_temp_line.position.x = 0;
        top_temp_line.scale.y = L_top;
        top_temp_line.position.y = L_top / 2. - params.H_stack + params.H_inversion;
        top_temp_line.position.z = -2. - T_top / temp_scale;
        top_temp_line.rotation.x = 0;
        rotateAboutPoint(top_temp_line, new THREE.Vector3(0, -params.H_stack + params.H_inversion, -2 - T_top / temp_scale), new THREE.Vector3(1, 0, 0), rot_angle, false);
    }
    else {
        temp_line.position.x = 0;
        temp_line.scale.y = H;
        temp_line.position.y = H / 2. - params.H_stack;
        temp_line.position.z = -2. - params.T_surf / temp_scale;
        temp_line.rotation.x = 0;
        var rot_angle = Math.atan(params.Gamma / 1000. / temp_scale);
        rotateAboutPoint(temp_line, new THREE.Vector3(0, -params.H_stack, -2 - params.T_surf / temp_scale), new THREE.Vector3(1, 0, 0), rot_angle, false);
    }

    adiab_line.position.x = 1;
    adiab_line.scale.y = H;
    adiab_line.position.y = H / 2. - params.H_stack;
    adiab_line.position.z = -2. - params.T_surf / temp_scale;
    adiab_line.rotation.x = 0;
    var rot_angle = Math.atan(Gamma_dry_adb / 1000. / temp_scale);
    rotateAboutPoint(adiab_line, new THREE.Vector3(0, -params.H_stack, -2 - params.T_surf / temp_scale), new THREE.Vector3(1, 0, 0), rot_angle, false);

}

function reset_particle_positions() {
    var positions = particles.geometry.attributes.position.array;
    for (var i = 0; i < N_max; i++) {
        positions[i * 3] = i / N_max * X_max; // x
        positions[i * 3 + 1] = 0; // y
        positions[i * 3 + 2] = 0; // z
        if (params.inversion_layer && (params.H_stack > params.H_inversion)) {
            T[i] = params.T_stack + params.T_surf - params.Gamma * (params.H_inversion) / 1000. - params.Gamma_inv * (params.H_stack - params.H_inversion) / 1000.; // Temp at this elevation, above inversion layer
        }
        else {
            T[i] = params.T_stack + params.T_surf - params.Gamma * params.H_stack / 1000.;
        }
    }
}

function add_particles() {
    var positions = new Float32Array(N_max * 3);
    var scales = new Float32Array(N_max);
    var colors = [];
    // var geometry = new THREE.Geometry();

    for (var i = 0; i < N_max; i++) {
        positions[i * 3] = i / N_max * X_max; // x
        positions[i * 3 + 1] = 0; // y
        positions[i * 3 + 2] = 0; // z
        scales[i] = 0.25;
        v_y[i] = 0;
        if (params.inversion_layer && (params.H_stack > params.H_inversion)) {
            T[i] = params.T_stack + params.T_surf - params.Gamma * (params.H_inversion) / 1000. - params.Gamma_inv * (params.H_stack - params.H_inversion) / 1000.; // Temp at this elevation, above inversion layer
        }
        else {
            T[i] = params.T_stack + params.T_surf - params.Gamma * params.H_stack / 1000.;
        }
        colors.push(1, 1, 1);
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // var material = new THREE.ShaderMaterial({
    //     vertexShader: document.getElementById('vertexshader').textContent,
    //     fragmentShader: document.getElementById('fragmentshader').textContent,
    //     vertexColors: THREE.VertexColors
    // });
    particles = new THREE.Points(geometry, CustomShader);
    world_objects.add(particles);
}

function add_gui() {
    gui.add(params, 'u').min(0).max(10).step(0.01).name('Wind speed at 10m (m/s)').listen();
    gui.add(params, 'H_stack').min(0.1).max(100).step(0.1).listen().name('Stack Height (m)').onChange(function () {
        stack.scale.y = params.H_stack;
        stack.position.y = -params.H_stack / 2; grid.position.y = -params.H_stack; floor.position.y = -params.H_stack;
        inversion_layer.position.y = params.H_inversion - params.H_stack - y_offset; reset_temp_line(); reset_particle_positions();
    });
    // gui.add( params, 'birth_rate').min(100).max(1000).name('Particle Rate (1/s)').listen();
    gui.add(params, 'D').min(0).max(0.1).step(0.001).name('Diffusivity (m²/s)').listen();
    gui.add(params, 'Dx').name('Diffusivity downwind').listen();

    if (VR) { var base_layer = gui; }
    else { var base_layer = gui.addFolder('Temperature effects'); }
    base_layer.add(params, 'adiab').name('Temperature effects').listen().onChange(function () { vert_axis.visible = params.adiab; horiz_axis.visible = params.adiab; temp_line.visible = params.adiab; });
    base_layer.add(params, 'Gamma').min(-200).max(200).step(1).name('Env lapse rate (°C/km)').listen().onChange(function () { reset_temp_line(); });
    base_layer.add(params, 'T_surf').min(0).max(50).step(0.1).name('Surface Temp (°C)').listen().onChange(function () { reset_temp_line(); });
    base_layer.add(params, 'T_stack').min(-50).max(50).step(0.1).name('Rel Stack Temp (°C)').listen();

    if (VR) { var inv_folder = gui; }
    else { var inv_folder = gui.addFolder('Inversion Layer'); }
    inv_folder.add(params, 'inversion_layer').name('Inversion layer').listen().onChange(function () { inversion_layer.visible = params.inversion_layer; reset_temp_line(); });
    inv_folder.add(params, 'H_inversion').min(0).max(50).step(0.1).name('Height of inv layer (m)').listen().onChange(function () { inversion_layer.position.y = params.H_inversion - params.H_stack; reset_temp_line(); });
    inv_folder.add(params, 'Gamma_inv').min(-200).max(200).name('Inv lapse rate (°C/km)').listen().onChange(function () { inversion_layer.position.y = params.H_inversion - params.H_stack; reset_temp_line(); });

    if (debug_air_flow) {
        if (VR) { var turb_folder = gui; }
        else { var turb_folder = gui.addFolder('Turbulence'); }
        turb_folder.add(params, 'turbulence').name('Turbulence').listen();
        turb_folder.add(params, 'I').name('Turbulence intensity').min(0).max(1).step(0.01).listen();
        turb_folder.add(params, 'omega').name('Eddy length (m)').min(0).max(10).step(0.01).listen();
    }

    if (VR) { // JUST IN VR MODE
        // presets = new THREE.Group;
        //gui.add( presets, 'Presets');
        gui.add(presets, 'Presets', ['Looping', 'Coning', 'Fanning', 'Lofting', 'Fumigation', 'Trapping']).onChange(function () { set_from_presets(); });
        //console.log(presets)

    }
    else { // JUST IN NON-VR MODE
        if (colour_options) {
            var colour_folder = gui;
            colour_folder.add(params, 'colour_by', ['Relative Temp', 'Temp', 'Vertical velocity']).name('Colour By').onChange(function () {
                if (params.colour_by === 'Relative Temp') { params.cmin = -1; params.cmax = 1; }
                else if (params.colour_by === 'Temp') { params.cmin = 0; params.cmax = 50; }
                else if (params.colour_by === 'Vertical velocity') { params.cmin = -2; params.cmax = 2; }
            });
            colour_folder.add(params, 'cmin').min(-10).max(10).name('Min colour').onChange(function () { lut.setMin(params.cmin); });
            colour_folder.add(params, 'cmax').min(-10).max(10).name('Max colour').onChange(function () { lut.setMax(params.cmax); });
        }
        gui.add(presets, 'Presets', ['Looping', 'Coning', 'Fanning', 'Lofting', 'Fumigation', 'Trapping']).name('Presets').onChange(function () { set_from_presets(); });
    }
}

function set_from_presets() {
    for (var i = 0; i < preset_settings.length; i++) {
        //console.log(presets.Presets)
        //console.log(preset_settings[i].Presets)
        if (presets.Presets === preset_settings[i].Presets) {
            var keys = Object.keys(preset_settings[i]);
            var values = Object.values(preset_settings[i])
            for (var j = 0; j < keys.length; j++) {
                params[keys[j]] = values[j];
            }

            reset_particle_positions();
            // just in case
            stack.scale.y = params.H_stack; stack.position.y = -params.H_stack / 2.; floor.position.y = -params.H_stack; grid.position.y = -params.H_stack + 0.01; inversion_layer.position.y = params.H_inversion - params.H_stack;
            inversion_layer.visible = params.inversion_layer;
            vert_axis.visible = params.adiab; horiz_axis.visible = params.adiab; temp_line.visible = params.adiab;
            reset_temp_line();
        }
    }
}

function add_renderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    if ( VR ) {
        renderer.xr.enabled = true;
        document.body.appendChild(VRButton.createButton(renderer));
    }
    else {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(2, 0, 0);
        controls.update();
    }

};
// function add_left_oculus_model(controller) {
//     new THREE.MTLLoader()
//         .setPath(root_dir + 'resources/oculus/')
//         .load('oculus-touch-controller-left.mtl', function (materials) {
//             materials.preload();
//             new THREE.OBJLoader()
//                 .setMaterials(materials)
//                 .setPath(root_dir + 'resources/oculus/')
//                 .load('oculus-touch-controller-left.obj', function (object) {
//                     object.castShadow = true;
//                     object.receiveShadow = true;
//                     // Pause label
//                     var font_loader = new THREE.FontLoader();
//                     font_loader.load(root_dir + 'node_modules/three/examples/fonts/helvetiker_bold.typeface.json', function (font) {
//                         var fontsize = 0.005;
//                         controller.add(object);
//                         var geometry = new THREE.TextBufferGeometry("Pick", { font: font, size: fontsize, height: fontsize / 5. });
//                         var material = new THREE.MeshPhongMaterial({ color: 0xdddddd });
//                         var move_label = new THREE.Mesh(geometry, material);
//                         move_label.rotation.x = -1. * Math.PI / 4.;
//                         move_label.rotation.y = Math.PI;
//                         move_label.position.y = -0.035 - fontsize;
//                         move_label.position.x = 0.018;
//                         move_label.position.z = 0.045;
//                         object.add(move_label);
//                     });
//                 });
//         });
// }

// function add_right_oculus_model(controller) {
//     new THREE.MTLLoader()
//         .setPath(root_dir + 'resources/oculus/')
//         .load('oculus-touch-controller-right.mtl', function (materials) {
//             materials.preload();
//             new THREE.OBJLoader()
//                 .setMaterials(materials)
//                 .setPath(root_dir + 'resources/oculus/')
//                 .load('oculus-touch-controller-right.obj', function (object) {
//                     object.castShadow = true;
//                     object.receiveShadow = true;

//                     // Pause label
//                     var font_loader = new THREE.FontLoader();
//                     font_loader.load(root_dir + 'node_modules/three/examples/fonts/helvetiker_bold.typeface.json', function (font) {
//                         var fontsize = 0.005;
//                         controller.add(object);
//                         // scene.add( object );

//                         var geometry = new THREE.TextBufferGeometry("Pick", { font: font, size: fontsize, height: fontsize / 5. });
//                         var material = new THREE.MeshPhongMaterial({ color: 0xdddddd });
//                         var move_label = new THREE.Mesh(geometry, material);
//                         move_label.rotation.x = -1. * Math.PI / 4.;
//                         move_label.rotation.y = Math.PI;
//                         move_label.position.y = -0.035 - fontsize;
//                         move_label.position.x = 0.0;
//                         move_label.position.z = 0.045;
//                         object.add(move_label);
//                     });
//                 });
//         });
// }

// function add_controllers() {
//     controller1 = new THREE.Object3D;
//     controller2 = new THREE.Object3D;

//     if (vive) {
//         var loader = new THREE.OBJLoader();
//         // loader.setPath( 'http://benjymarks.com/nddem/visualise/resources/vive/' );
//         loader.load('resources/vr_controller_vive_1_5.obj', function (object) {
//             var loader = new THREE.TextureLoader();
//             // loader.setPath( 'http://benjymarks.com/nddem/visualise/resources/vive/' );
//             var controller = object.children[0];
//             controller.material.map = loader.load('resources/onepointfive_texture.png');
//             controller.material.specularMap = loader.load('resources/onepointfive_spec.png');
//             controller1.add(controller.clone());
//             controller2.add(controller.clone());
//         });
//     }

//     window.addEventListener('vr controller connected', function (event) {
//         //  Here it is, your VR controller instance.
//         //  It’s really a THREE.Object3D so you can just add it to your scene:
//         var controller = event.detail
//         if (controller.gamepad.hand === 'left') {
//             controller.add(controller1);
//             if (controller.gamepad.id === 'Oculus Touch (Left)') { add_left_oculus_model(controller); }
//         }
//         else if (controller.gamepad.hand === 'right') {
//             controller.add(controller2);
//             if (controller.gamepad.id === 'Oculus Touch (Right)') { add_right_oculus_model(controller); }
//         }
//         scene.add(controller);
//         controller.standingMatrix = renderer.vr.getStandingMatrix();
//         controller.head = window.camera;
//         var guiInputHelper = dat.GUIVR.addInputObject(controller); //  Allow this controller to interact with DAT GUI.
//         scene.add(guiInputHelper);

//         controller.addEventListener('thumbstick axes changed', function (event) {
//             up = -event.axes[1]; // distance up on the thumbstick
//             left = event.axes[0];
//             event.target.getWorldDirection(direction); // controller
//             //console.log(direction);
//         });

//         // controller.addEventListener( 'thumbstick axes changed', function( event ) {
//         //  var up = - event.axes[1];
//         // } );
//         //THREE.VRController.verbosity = 1;
//         //THREE.VRController.inspect()
//     });
// }

function init() {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    scene = new THREE.Scene();
    scene.add(world_objects);

    var ambientLight = new THREE.AmbientLight(0xaaaaaa);
    world_objects.add(ambientLight);

    var light = new THREE.PointLight(0xaaaaaa, 5000);
    light.position.set(5, 20, 5);
    world_objects.add(light);

    grid = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
    // grid.material.depthTest = false;
    // grid.rotation.x = Math.PI/2.;
    grid.position.y = -params.H_stack + 0.01;
    world_objects.add(grid);

    var geometry = new THREE.PlaneGeometry();//R, R, params.H_stack, 32 );
    var material = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
    floor = new THREE.Mesh(geometry, material);

    floor.rotation.x = Math.PI / 2.;
    floor.position.y = -params.H_stack;
    floor.scale.set(2 * X_max, 2 * X_max, 1);
    world_objects.add(floor);

    var geometry = new THREE.PlaneGeometry();//R, R, params.H_stack, 32 );
    var material = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide, opacity: 0.2, transparent: true });
    inversion_layer = new THREE.Mesh(geometry, material);

    inversion_layer.rotation.x = Math.PI / 2.;
    inversion_layer.position.y = params.H_inversion - params.H_stack;
    inversion_layer.scale.set(2 * X_max, 2 * X_max, 1);
    world_objects.add(inversion_layer);
    inversion_layer.visible = params.inversion_layer;

    if (!VR) { window.addEventListener('resize', onWindowResize, false); }

    var geometry = new THREE.CylinderGeometry(R, R, 1, 32);
    var material = new THREE.MeshStandardMaterial({ color: 0xe72564 });
    stack = new THREE.Mesh(geometry, material);
    stack.scale.y = params.H_stack;
    stack.position.y = -params.H_stack / 2.;
    world_objects.add(stack);
    world_objects.add(particles);


    if (VR) { // get good initial state
        world_objects.position.x = -1;
        world_objects.position.y = 2;
        world_objects.position.z = 1;
    }
    else { camera.position.set(2, 1, 3); }

}

function moveParticles(dt) {
    var positions = particles.geometry.attributes.position.array;
    var colors = particles.geometry.attributes.color.array;
    var scales = particles.geometry.attributes.scale.array;
    var delta = Math.sqrt(2. * params.D * dt);

    if (params.Dx) {
        for (var i = 0; i < N_max; i++) {
            positions[i * 3] += (Math.random() - 0.5) * delta;
        }
    }
    for (var i = 0; i < N_max; i++) {
        var t = clock.getElapsedTime();
        positions[i * 3 + 2] += (Math.random() - 0.5) * delta;
        var dy = (Math.random() - 0.5) * delta;
        if (params.wind_type === 'Uniform') { u = params.u; }
        else if (params.wind_type === 'Boundary Layer') {
            u = params.u * Math.pow(Math.abs(params.H_stack + positions[i * 3 + 1]) / 10., 0.143); // u = u_{10m}(z)*(z/10)^0.143
        }
        if (params.turbulence) {
            positions[i * 3] += u * dt * (1. + params.I * Math.cos((positions[i * 3] - u * t) / params.omega) * Math.sin(positions[i * 3 + 1] / params.omega));
            dy -= u * dt * params.I * Math.sin((positions[i * 3] - u * t) / params.omega) * Math.cos(positions[i * 3 + 1] / params.omega);
        }
        else {
            positions[i * 3] += u * dt;
        }
        positions[i * 3 + 1] += dy;
        T[i] += -Gamma_dry_adb * dy / 1000.; // particle cools adiabatically with adiabatic lapse rate

        if (positions[i * 3] > X_max) { // reset particle
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            v_y[i] = 0;
            if (params.inversion_layer && (params.H_stack > params.H_inversion)) {
                T[i] = params.T_stack + params.T_surf - params.Gamma * (params.H_inversion) / 1000. - params.Gamma_inv * (params.H_stack - params.H_inversion) / 1000.; // Temp at this elevation, above inversion layer
            }
            else {
                T[i] = params.T_stack + params.T_surf - params.Gamma * params.H_stack / 1000.;
            }
        }

    }
    if (params.adiab) {
        for (var i = 0; i < N_max; i++) {
            if (positions[i * 3 + 1] + params.H_stack > params.H_inversion && params.inversion_layer) {
                var T_elevation = params.T_surf - params.Gamma * (params.H_inversion) / 1000. - params.Gamma_inv * (positions[i * 3 + 1] + params.H_stack - params.H_inversion) / 1000.; // Temp at this elevation, above inversion layer
            }
            else {
                var T_elevation = params.T_surf - params.Gamma * (positions[i * 3 + 1] + params.H_stack) / 1000.; // Temp at this elevation
            }
            var a_y = g * ((T[i] + 273.15) / (T_elevation + 273.15) - 1.);
            a_y -= 1e0 * Math.pow(v_y[i], 2) * Math.sign(v_y[i]);

            v_y[i] += a_y * dt;
            var dy = v_y[i] * dt;
            positions[i * 3 + 1] += dy;
            T[i] += -Gamma_dry_adb * dy / 1000.; // particle cools adiabatically with adiabatic lapse rate
            if (positions[i * 3 + 1] < -params.H_stack) { // bounce off floor
                positions[i * 3 + 1] -= 1.5 * (params.H_stack + positions[i * 3 + 1]); // put back in - little bit of dissipation to look nice
                T[i] = params.T_surf;//-params.Gamma*( positions[ i*3 + 1 ]+params.H_stack )/1000.;
                v_y[i] = 0;
            }
            let c;
            if (params.colour_by === 'Relative Temp') { c = lut.getColor(T[i] - T_elevation); }
            else if (params.colour_by === 'Temp') { c = lut.getColor(T[i]); }
            else if (params.colour_by === 'Vertical velocity') { c = lut.getColor(v_y[i]); }

            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;

            // var P = 1e5*Math.exp(-positions[ i*3 + 1]/7000.);
            // scales[i] = Math.pow(nR*T[i]/P,0.33333);  // V = nRT/P, d \propto V**0.33;
            // scales[i] = nR*T[i]/P;  // V = nRT/P - looks a bit better

        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    // particles.geometry.attributes.scale.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    // camera.lookAt(2,0,0);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {
    // THREE.VRController.update();
    requestAnimationFrame(animate);
    // render();
    renderer.setAnimationLoop(render);
}

function render() {
    var deltaTime = clock.getDelta();
    world_objects.position.x += fly_speed * up * deltaTime * direction.x;
    world_objects.position.y += fly_speed * up * deltaTime * direction.y;
    world_objects.position.z += fly_speed * up * deltaTime * direction.z;

    // NOTE: need to do something clever here, don't have the brain power tonight
    // var left_direction = THREE.Vector3.crossVectors(direction,;
    // world_objects.position.x += fly_speed*left*deltaTime*left_direction.x;
    // world_objects.position.y += fly_speed*left*deltaTime*left_direction.y;
    // world_objects.position.z += fly_speed*left*deltaTime*left_direction.z;

    moveParticles(deltaTime);
    if ( controls !== undefined ) { controls.update(); }
    renderer.render(scene, camera);
}
