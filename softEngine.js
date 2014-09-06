var SoftEngine;

(function (SoftEngine) {
    var Camera = (function () {
        function Camera() {
            this.Position = BABYLON.Vector3.Zero();
            this.Target = BABYLON.Vector3.Zero();
        }

        return Camera;
    })();
    SoftEngine.Camera = Camera;

    var Mesh = (function () {
        function Mesh(name, verticesCount, facesCount) {
       	    this.name = name;
       	    this.Vertices = new Array(verticesCount);
       	    this.Faces = new Array(facesCount);
       	    this.Rotation = BABYLON.Vector3.Zero();
       	    this.Position = BABYLON.Vector3.Zero();
       	    this.Scaling = new BABYLON.Vector3(1,1,1);
       	}

       	return Mesh;
    })();
    SoftEngine.Mesh = Mesh;

    var Device = (function () {
        function Device(canvas) {
       	    this.workingCanvas = canvas;
       	    this.workingWidth = canvas.width;
       	    this.workingHeight = canvas.height;
       	    this.workingContext = this.workingCanvas.getContext("2d");
       	}

       	Device.prototype.clear = function() {
       	    this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
       	    this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
       	};

       	Device.prototype.present = function() {
       	    this.workingContext.putImageData(this.backbuffer, 0, 0);
       	};

       	Device.prototype.putPixel = function(x, y, color) {
       	    this.backbufferdata = this.backbuffer.data;
       	    var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

       	    this.backbufferdata[index] = color.r * 255;
       	    this.backbufferdata[index + 1] = color.g * 255;
       	    this.backbufferdata[index + 2] = color.b * 255;
       	    this.backbufferdata[index + 3] = color.a * 255;
       	};


       	Device.prototype.project = function(coord, transMat) {
       	    var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
       	    var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
       	    var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;

       	    return (new BABYLON.Vector2(x, y));
       	}

       	Device.prototype.drawPoint = function(point) {
       	    if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth
       	         && point.y < this.workingHeight) {
                       this.putPixel(point.x, point.y, new BABYLON.Color4(1, 0, 1, 1));
       	    }
       	};

       	Device.prototype.drawLine = function (point0, point1) {
       	    var dist = point1.subtract(point0).length();

       	    if (dist < 2) { return; }

       	    var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
       	    this.drawPoint(middlePoint);

       	    this.drawLine(point0, middlePoint);
       	    this.drawLine(middlePoint, point1);
       	};

        Device.prototype.drawBresenhamLine = function (point0, point1) {
            var x0 = point0.x >> 0;
            var y0 = point0.y >> 0;
            var x1 = point1.x >> 0;
            var y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var error = dx - dy;
            while (true) {
                 this.drawPoint(new BABYLON.Vector2(x0, y0));
                 if ((x0 == x1) && (y0 == y1)) break;
                 var e2 = 2 * error;
                 if (e2 > -dy) { error -= dy; x0 += sx; }
                 if (e2 < dx) { error += dx; y0 += sy; }
            }
        };

        Device.prototype.render = function(camera, meshes) {
       	    var viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target,
                       			    	BABYLON.Vector3.Up());

       	    var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78,
                            			    		this.workingWidth / this.workingHeight,
                                					0.01, 1.0);

       	    for (var index = 0; index < meshes.length; index++) {
       	        var currentMesh = meshes[index];

              		var worldMatrix =
                      BABYLON.Matrix.Scaling(currentMesh.Scaling.x, currentMesh.Scaling.y,
                       currentMesh.Scaling.z)
                      .multiply(BABYLON.Matrix.RotationYawPitchRoll(
                     			currentMesh.Rotation.y, currentMesh.Rotation.x, currentMesh.Rotation.z))
                   			.multiply(BABYLON.Matrix.Translation(
                   			 currentMesh.Position.x, currentMesh.Position.y, currentMesh.Position.z));

              		var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);

              		for (var indexFaces = 0; indexFaces < currentMesh.Faces.length; indexFaces++) {
                    var currentFace = currentMesh.Faces[indexFaces];
                    var vertexA = currentMesh.Vertices[currentFace.A];
                    var vertexB = currentMesh.Vertices[currentFace.B];
                    var vertexC = currentMesh.Vertices[currentFace.C];

                    var pixelA = this.project(vertexA, transformMatrix);
                    var pixelB = this.project(vertexB, transformMatrix);
                    var pixelC = this.project(vertexC, transformMatrix);

                    this.drawBresenhamLine(pixelA, pixelB);
                    this.drawBresenhamLine(pixelB, pixelC);
                    this.drawBresenhamLine(pixelC, pixelA);
              		}
       	    }
       	};
       	return Device;
    })();
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));
