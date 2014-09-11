var canvas;
var device;
var previousDate = Date.now();
var meshes = [];
var camera;

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = document.getElementById("frontBuffer");
    camera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);
    camera.Position = new BABYLON.Vector3(-20, 0, 10);
    camera.Target = new BABYLON.Vector3(0, 0, 0);
    device.LoadJSONFileAsync("mesh.js", loadJSONCompleted);
}

function loadJSONCompleted(meshesLoaded) {
    meshes = meshesLoaded;
    requestAnimationFrame(drawingLoop);
}

function drawingLoop() {
    handleFPS();
    device.clear();

    for (var i = 0; i < meshes.length; i++) {
        meshes[i].Rotation.y -= 0.01;
    }

    device.render(camera, meshes);
    device.present();

    requestAnimationFrame(drawingLoop);
}

function handleFPS() {
   var fpscontainer = document.getElementById("fpsContainer");
   var now = Date.now();
   fpscontainer.textContent = 1000 / (now - previousDate);
   previousDate = now;
}
