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
            this.depthbuffer = new Array(this.workingWidth * this.workingHeight);
       	};

       	Device.prototype.LoadJSONFileAsync = function(fileName, callback) {
               var jsonObject = {};
               var xmlhttp = new XMLHttpRequest();
               xmlhttp.open("GET", fileName, true);
               var device = this;
               xmlhttp.onreadystatechange = function() {
                   if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                       jsonObject = JSON.parse(xmlhttp.responseText);
                       callback(device.CreateMeshesFromJSON(jsonObject));
                   }
               };
               xmlhttp.send(null);
        };

        Device.prototype.CreateMeshesFromJSON = function (jsonObject) {
            var meshes = [];
            for (var meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                var verticesArray = jsonObject.meshes[meshIndex].vertices;
                //Faces
                var indicesArray = jsonObject.meshes[meshIndex].indices;

                var uvCount = jsonObject.meshes[meshIndex].uvCount;
                var verticesStep = 1;

                switch (uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }

                var verticesCount = verticesArray.length / verticesStep;
                var facesCount = indicesArray.length / 3;
                var mesh = new SoftEngine.Mesh(jsonObject.meshes[meshIndex].name, verticesCount, facesCount);

                // Vertices
                for (var index = 0; index < verticesCount; index++) {
                    var x = verticesArray[index * verticesStep];
                    var y = verticesArray[index * verticesStep + 1];
                    var z = verticesArray[index * verticesStep + 2];
                    // loading normals
                    var nx = verticesArray[index * verticesStep + 3];
                    var ny = verticesArray[index * verticesStep + 4];
                    var nz = verticesArray[index * verticesStep + 5];
                    mesh.Vertices[index] = {
                        Coordinates: new BABYLON.Vector3(x, y, z),
                        Normal: new BABYLON.Vector3(nx, ny, nz),
                        WorldCoordinates: null
                    };
                }

                // Faces
                for (var index = 0; index < facesCount; index++) {
                    var a = indicesArray[index * 3];
                    var b = indicesArray[index * 3 + 1];
                    var c = indicesArray[index * 3 + 2];
                    mesh.Faces[index] = {
                        A: a,
                        B: b,
                        C: c
                    };
                }

                var position = jsonObject.meshes[meshIndex].position;
                mesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
                meshes.push(mesh);
            }
            return meshes;
        };

       	Device.prototype.clear = function() {
       	    this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
       	    this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);

            for (var i = 0; i < this.depthbuffer.length; i++) {
                this.depthbuffer[i] = 10000000;
            }
       	};

       	Device.prototype.present = function() {
       	    this.workingContext.putImageData(this.backbuffer, 0, 0);
       	};

       	Device.prototype.putPixel = function(x, y, z, color) {
       	    this.backbufferdata = this.backbuffer.data;
       	    var index = ((x >> 0) + (y >> 0) * this.workingWidth);
            var index4 = index * 4

            if (this.depthbuffer[index] < z) {
                return;
            }

            this.depthbuffer[index] = z;

       	    this.backbufferdata[index4] = color.r * 255;
       	    this.backbufferdata[index4 + 1] = color.g * 255;
       	    this.backbufferdata[index4 + 2] = color.b * 255;
       	    this.backbufferdata[index4 + 3] = color.a * 255;
       	};


       	Device.prototype.project = function(vertex, transMat, world) {
       	    var point2d = BABYLON.Vector3.TransformCoordinates(vertex.Coordinates, transMat);
       	    var point3dWorld = BABYLON.Vector3.TransformCoordinates(vertex.Coordinates, world);
       	    var normal3dWorld = BABYLON.Vector3.TransformCoordinates(vertex.Normal, world);

       	    var x = point2d.x * this.workingWidth + this.workingWidth / 2.0;
       	    var y = -point2d.y * this.workingHeight + this.workingHeight / 2.0;

       	    return ({
             Coordinates: new BABYLON.Vector3(x, y, point2d.z),
             Normal: normal3dWorld,
             WorldCoordinates: point3dWorld
            });
       	}

        Device.prototype.clamp = function(value, min, max) {
            if (typeof min === "undefined") { min = 0; }
            if (typeof max === "undefined") { max = 1; }
            return Math.max(min, Math.min(value, max));
        }

        Device.prototype.interpolate = function(min, max, gradient) {
            return min + (max - min) * this.clamp(gradient);
        }

        // papb -> pcpd
        // Y is used to compute gradient to get starting X (sx) and ending X (ex)
        Device.prototype.processScanLine = function(data, va, vb, vc, vd, color) {
            var pa = va.Coordinates,
                pb = vb.Coordinates,
                pc = vc.Coordinates,
                pd = vd.Coordinates;

            var gradient1 = pa.y != pb.y ? (data.currentY - pa.y) / (pb.y - pa.y) : 1;
            var gradient2 = pc.y != pd.y ? (data.currentY - pc.y) / (pd.y - pc.y) : 1;

            var sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
            var ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;

            var z1 = this.interpolate(pa.z, pb.z, gradient1);
            var z2 = this.interpolate(pc.z, pd.z, gradient2);

            for (var x = sx; x < ex; x++) {
                var gradient = (x - sx) / (ex - sx);
                var z = this.interpolate(z1, z2, gradient);
                var ndotl = data.ndotla;
                this.drawPoint(new BABYLON.Vector3(x, data.currentY, z),
                               new BABYLON.Color4(color.r * ndotl, color.g * ndotl,
                                                  color.b * ndotl, 1));
            }
        };

        Device.prototype.computeNDotL = function(vertex, normal, lightPosition) {
            var lightDirection = lightPosition.subtract(vertex);

            normal.normalize();
            lightDirection.normalize();

            return Math.max(0, BABYLON.Vector3.Dot(normal, lightDirection));
        }

        Device.prototype.drawTriangle = function(v1, v2, v3, color) {
            // Sort points to p1 always up and p2 between p1 and p3
            if (v1.Coordinates.y > v2.Coordinates.y) {
                var temp = v2;
                v2 = v1;
                v1 = temp;
            }
            if (v2.Coordinates.y > v3.Coordinates.y) {
                var temp = v2;
                v2 = v3;
                v3 = temp;
            }
            if (v1.Coordinates.y > v2.Coordinates.y) {
                var temp = v2;
                v2 = v1;
                v1 = temp;
            }

            var p1 = v1.Coordinates,
                p2 = v2.Coordinates,
                p3 = v3.Coordinates;

            var vnFace = (v1.Normal.add(v2.Normal.add(v3.Normal))).scale(1/3);
            var centerPoint = (v1.WorldCoordinates.add(v2.WorldCoordinates.add(v3.WorldCoordinates))).scale(1/3);

            var lightPosition = new BABYLON.Vector3(-50, 0, 0);

            var ndotl = this.computeNDotL(centerPoint, vnFace, lightPosition);

            var data = { ndotla: ndotl };

            // inverse slopes
            var dP1P2, dP1P3;

            if (p2.y - p1.y > 0) {
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
            }
            else {
                dP1P2 = 0;
            }

            if (p3.y - p1.y > 0) {
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
            }
            else {
                dP1P3 = 0;
            }

            if (dP1P2 > dP1P3) {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;

                    if (y < p2.y) {
                        this.processScanLine(data, v1, v3, v1, v2, color);
                    }
                    else {
                        this.processScanLine(data, v1, v3, v2, v3, color);
                    }
                }
            }
            else {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;

                    if (y < p2.y) {
                        this.processScanLine(data, v1, v2, v1, v3, color);
                    }
                    else {
                        this.processScanLine(data, v2, v3, v1, v3, color);
                    }
                }
            }

        }

       	Device.prototype.drawPoint = function(point, color) {
       	    if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth
       	         && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, point.z, color);
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

                        var pixelA = this.project(vertexA, transformMatrix, worldMatrix);
                        var pixelB = this.project(vertexB, transformMatrix, worldMatrix);
                        var pixelC = this.project(vertexC, transformMatrix, worldMatrix);

                        var color = 0.25 + ((indexFaces % currentMesh.Faces.length) / currentMesh.Faces.length) * 0.75;
                        this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1));
              		}
       	    }
       	};
       	return Device;
    })();
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));
